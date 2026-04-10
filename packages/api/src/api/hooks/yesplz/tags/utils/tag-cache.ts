import { MedusaContainer } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import CustomCacheModuleService from '../../../../../modules/cache/service'
import { normalizeTagValue } from './normalize-tags'

export interface CachedTag {
  id: string
  value: string
}

const CACHE_PREFIX = 'tag:value:'
const CACHE_TTL = 3600 // 1 hour in seconds

/**
 * Get tag from cache or database
 * @param container - Medusa container
 * @param normalizedValue - Normalized tag value (lowercase)
 * @returns Cached tag or null if not found
 */
export async function getTagFromCache(
  container: MedusaContainer,
  normalizedValue: string
): Promise<CachedTag | null> {
  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    const cacheKey = `${CACHE_PREFIX}${normalizedValue}`
    
    const cached = await cacheService.get<CachedTag>(cacheKey)
    if (cached) {
      return cached
    }
    
    return null
  } catch (error) {
    console.error(`[TagCache] Error getting tag from cache:`, error)
    return null
  }
}

/**
 * Set tag in cache
 * @param container - Medusa container
 * @param tag - Tag object with id and value
 */
export async function setTagInCache(
  container: MedusaContainer,
  tag: CachedTag
): Promise<void> {
  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    const normalizedValue = normalizeTagValue(tag.value)
    
    if (!normalizedValue) {
      return
    }
    
    const cacheKey = `${CACHE_PREFIX}${normalizedValue}`
    await cacheService.set(cacheKey, tag, CACHE_TTL)
  } catch (error) {
    console.error(`[TagCache] Error setting tag in cache:`, error)
  }
}

/**
 * Batch get tags from cache using MGET
 * @param container - Medusa container
 * @param normalizedValues - Array of normalized tag values
 * @returns Map of normalizedValue -> CachedTag or null
 */
export async function getTagsFromCacheBatch(
  container: MedusaContainer,
  normalizedValues: string[]
): Promise<Map<string, CachedTag | null>> {
  const result = new Map<string, CachedTag | null>()
  
  if (!normalizedValues || normalizedValues.length === 0) {
    return result
  }
  
  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    const cacheKeys = normalizedValues.map(v => `${CACHE_PREFIX}${v}`)
    
    // Use mget for batch retrieval (uses Redis MGET internally)
    const cachedValues = await cacheService.mget<CachedTag>(cacheKeys)
    
    normalizedValues.forEach((value, index) => {
      result.set(value, cachedValues[index] || null)
    })
  } catch (error) {
    console.error(`[TagCache] Error batch getting tags from cache:`, error)
    // Return empty map on error
    normalizedValues.forEach(value => {
      result.set(value, null)
    })
  }
  
  return result
}

/**
 * Batch set tags in cache using pipeline SET
 * @param container - Medusa container
 * @param tags - Array of tag objects
 */
export async function setTagsInCacheBatch(
  container: MedusaContainer,
  tags: CachedTag[]
): Promise<void> {
  if (!tags || tags.length === 0) {
    return
  }
  
  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    
    const entries = tags
      .map(tag => {
        const normalizedValue = normalizeTagValue(tag.value)
        if (!normalizedValue) return null
        
        return {
          key: `${CACHE_PREFIX}${normalizedValue}`,
          data: tag,
          ttl: CACHE_TTL
        }
      })
      .filter((entry): entry is { key: string; data: CachedTag; ttl: number } => entry !== null)
    
    if (entries.length > 0) {
      // Uses Redis pipeline internally via mset
      await cacheService.mset(entries)
    }
  } catch (error) {
    console.error(`[TagCache] Error batch setting tags in cache:`, error)
  }
}

/**
 * Invalidate tag cache
 * @param container - Medusa container
 * @param normalizedValue - Normalized tag value
 */
export async function invalidateTagCache(
  container: MedusaContainer,
  normalizedValue: string
): Promise<void> {
  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    const cacheKey = `${CACHE_PREFIX}${normalizedValue}`
    await cacheService.invalidate(cacheKey)
  } catch (error) {
    console.error(`[TagCache] Error invalidating tag cache:`, error)
  }
}


