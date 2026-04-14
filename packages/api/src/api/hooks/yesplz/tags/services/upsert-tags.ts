import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createProductTagsWorkflow } from '@medusajs/medusa/core-flows'
import { normalizeTagValue } from '../utils/normalize-tags'
import { 
  getTagsFromCacheBatch,
  setTagsInCacheBatch,
  CachedTag 
} from '../utils/tag-cache'

export interface UpsertTagsResult {
  tagIds: string[]
  created: number
  existing: number
}

/**
 * Upsert tags: find existing tags or create new ones
 * - Uses Redis caching to avoid repeated database queries
 * - Normalizes tags to lowercase
 * - Performs case-insensitive lookup
 * - Creates tags if they don't exist
 * - Returns array of tag IDs
 * 
 * Flow:
 * 1. Normalize all tags
 * 2. Redis MGET (batch cache lookup)
 * 3. Process cache hits immediately
 * 4. Batch DB query for cache misses
 * 5. Create missing tags
 * 6. Pipeline SET cache (all results at once)
 * 7. Return IDs
 */
export async function upsertTags(
  container: MedusaContainer,
  tags: string[]
): Promise<UpsertTagsResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const tagIds: string[] = []
  let created = 0
  let existing = 0

  // Step 1: Normalize all tags first
  const normalizedTags = tags
    .map(tag => normalizeTagValue(tag))
    .filter((value): value is string => value !== null)

  if (normalizedTags.length === 0) {
    return { tagIds: [], created: 0, existing: 0 }
  }

  // Step 2: Redis MGET (batch cache lookup)
  const cacheMap = await getTagsFromCacheBatch(container, normalizedTags)
  
  // Step 3: Process cache hits immediately
  const cachedTags: Map<string, CachedTag> = new Map()
  const uncachedTags: string[] = []
  
  normalizedTags.forEach(normalizedValue => {
    const cached = cacheMap.get(normalizedValue)
    if (cached) {
      cachedTags.set(normalizedValue, cached)
      tagIds.push(cached.id)
      existing++
    } else {
      uncachedTags.push(normalizedValue)
    }
  })

  // If all tags were cached, return early
  if (uncachedTags.length === 0) {
    return { tagIds, created, existing }
  }

  // Step 4: Batch DB query for cache misses
  const { data: existingTags } = await query.graph({
    entity: 'product_tag',
    fields: ['id', 'value'],
    filters: {
      value: { $in: uncachedTags } // Batch query instead of sequential
    }
  })

  // Create a map of normalized value -> tag for quick lookup
  const existingTagsMap = new Map<string, CachedTag>()
  if (existingTags && existingTags.length > 0) {
    existingTags.forEach((tag: { id: string; value: string }) => {
      const normalized = normalizeTagValue(tag.value)
      if (normalized) {
        existingTagsMap.set(normalized, { id: tag.id, value: tag.value })
      }
    })
  }

  // Separate tags into found and need-to-create
  const foundTags: CachedTag[] = []
  const tagsToCreate: string[] = []

  for (const normalizedValue of uncachedTags) {
    const existingTag = existingTagsMap.get(normalizedValue)
    
    if (existingTag) {
      // Tag exists in database
      tagIds.push(existingTag.id)
      existing++
      foundTags.push(existingTag)
    } else {
      // Tag doesn't exist, need to create
      tagsToCreate.push(normalizedValue)
    }
  }

  // Step 5: Create missing tags
  const createdTags: CachedTag[] = []
  
  for (const normalizedValue of tagsToCreate) {
    try {
      const workflowResult = await createProductTagsWorkflow(container).run({
        input: {
          product_tags: [
            {
              value: normalizedValue
            }
          ]
        }
      })

      const result = workflowResult?.result || workflowResult
      const createdTag = Array.isArray(result) ? result[0] : result

      if (createdTag && createdTag.id) {
        tagIds.push(createdTag.id)
        created++
        
        createdTags.push({
          id: createdTag.id,
          value: createdTag.value || normalizedValue
        })
      } else {
        console.error(`[UpsertTags] Failed to create tag: ${normalizedValue}`, workflowResult)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[UpsertTags] Error processing tag "${normalizedValue}":`, errorMessage)
      // Continue with other tags even if one fails
    }
  }

  // Step 6: Pipeline SET cache (all results at once - found + created)
  const allTagsToCache: CachedTag[] = [...foundTags, ...createdTags]
  if (allTagsToCache.length > 0) {
    await setTagsInCacheBatch(container, allTagsToCache)
  }

  // Step 7: Return IDs
  return {
    tagIds,
    created,
    existing
  }
}

