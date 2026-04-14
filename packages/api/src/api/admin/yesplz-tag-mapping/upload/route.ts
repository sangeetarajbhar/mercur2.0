import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { parse } from 'csv-parse/sync'
import { normalizeTagValue } from '../../../hooks/yesplz/tags/utils/normalize-tags'
import { upsertTags } from '../../../hooks/yesplz/tags/services/upsert-tags'
import { getTagsFromCacheBatch } from '../../../hooks/yesplz/tags/utils/tag-cache'

/**
 * @oas [post] /admin/yesplz-tag-mapping/upload
 * operationId: "AdminUploadYesPlzTagMapping"
 * summary: "Upload CSV to manage product tags"
 * description: "Upload a CSV file with product_id, tags, and action columns to add or remove tags from products"
 * x-authenticated: true
 * requestBody:
 *   content:
 *     multipart/form-data:
 *       schema:
 *         type: object
 *         properties:
 *           file:
 *             type: string
 *             format: binary
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Admin YesPlz Tag Mapping
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const logger = req.scope.resolve('logger')
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Get uploaded file
    const file = (req as any).file
    if (!file) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file was uploaded. Please provide a CSV file.'
      )
    }

    // Validate file type
    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Invalid file type. Please upload a CSV file.'
      )
    }

    // Parse CSV
    const fileContent = file.buffer.toString('utf-8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    if (records.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'CSV file is empty or has no valid rows.'
      )
    }

    // Validate required columns
    const requiredColumns = ['product_id', 'tags', 'action']
    const headers = Object.keys(records[0])
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    
    if (missingColumns.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Missing required columns: ${missingColumns.join(', ')}. Required columns: ${requiredColumns.join(', ')}`
      )
    }

    // Process records
    const results = {
      added: 0,
      removed: 0,
      errors: [] as Array<{ row: number; error: string }>
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const rowNumber = i + 2 // +2 because index is 0-based and header is row 1

      try {
        const { product_id, tags, action } = record

        // Validate required fields
        if (!product_id || !tags || !action) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required fields: product_id, tags, or action'
          })
          continue
        }

        // Validate action
        const normalizedAction = action.toLowerCase().trim()
        if (normalizedAction !== 'add' && normalizedAction !== 'remove') {
          results.errors.push({
            row: rowNumber,
            error: `Invalid action: ${action}. Must be 'add' or 'remove'`
          })
          continue
        }

        // Validate product exists
        const { data: products } = await query.graph({
          entity: 'product',
          fields: ['id'],
          filters: { id: product_id }
        })

        if (!products || products.length === 0) {
          results.errors.push({
            row: rowNumber,
            error: `Product not found: ${product_id}`
          })
          continue
        }

        // Parse tags (can be comma-separated in the tags column)
        // Note: CSV parser already handles comma-separated values, so tags might be a single string
        // If tags contain commas, they should be quoted in CSV, otherwise split by comma
        let tagValues: string[] = []
        if (typeof tags === 'string') {
          // Remove quotes if present and split by comma
          const cleanedTags = tags.replace(/^["']|["']$/g, '')
          tagValues = cleanedTags.split(',').map((t: string) => t.trim()).filter(Boolean)
        } else if (Array.isArray(tags)) {
          tagValues = tags.map((t: string) => String(t).trim()).filter(Boolean)
        }
        
        if (tagValues.length === 0) {
          results.errors.push({
            row: rowNumber,
            error: 'No valid tags found'
          })
          continue
        }

        // Normalize tags
        const normalizedTags = tagValues.map(normalizeTagValue).filter(Boolean) as string[]

        if (normalizedAction === 'remove') {
          // Remove tags from product
          // OPTIMIZATION: Check cache first, then query database for uncached tags
          const cacheMap = await getTagsFromCacheBatch(req.scope, normalizedTags)
          
          const cachedTagIds: string[] = []
          const uncachedTags: string[] = []
          
          normalizedTags.forEach(normalizedValue => {
            const cached = cacheMap.get(normalizedValue)
            if (cached) {
              cachedTagIds.push(cached.id)
            } else {
              uncachedTags.push(normalizedValue)
            }
          })
          
          // Query database for uncached tags
          let uncachedTagIds: string[] = []
          if (uncachedTags.length > 0) {
            const { data: existingTags } = await query.graph({
              entity: 'product_tag',
              fields: ['id', 'value'],
              filters: {
                value: { $in: uncachedTags }
              }
            })

            if (existingTags && existingTags.length > 0) {
              uncachedTagIds = existingTags.map((t: { id: string }) => t.id)
            }
          }
          
          // Combine cached and uncached tag IDs
          const tagIds = [...cachedTagIds, ...uncachedTagIds]
          
          if (tagIds.length > 0) {
            // Delete from product_tags junction table
            const deleted = await knex('product_tags')
              .where('product_id', product_id)
              .whereIn('product_tag_id', tagIds)
              .delete()
            
            results.removed += deleted
          }
        } else if (normalizedAction === 'add') {
          // Add tags to product
          // Upsert tags (create or find existing)
          const upsertResult = await upsertTags(req.scope, normalizedTags as string[])

          if (upsertResult.tagIds.length > 0) {
            // Check existing mappings to avoid duplicates
            const existingMappings = await knex('product_tags')
              .where('product_id', product_id)
              .whereIn('product_tag_id', upsertResult.tagIds)
              .select('product_tag_id')
            
            const existingTagIds = new Set(
              existingMappings.map((m: { product_tag_id: string }) => m.product_tag_id)
            )
            const newTagIds = upsertResult.tagIds.filter(tagId => !existingTagIds.has(tagId))
            
            if (newTagIds.length > 0) {
              // Insert new tag mappings
              const insertData = newTagIds.map(tagId => ({
                product_id: product_id,
                product_tag_id: tagId
              }))
              
              await knex('product_tags').insert(insertData)
              results.added += newTagIds.length
            }
          }
        }
      } catch (rowError: unknown) {
        const errorMessage = rowError instanceof Error ? rowError.message : String(rowError)
        results.errors.push({
          row: rowNumber,
          error: errorMessage
        })
      }
    }

    logger.info(
      `[YesPlz Tag Mapping Upload] Processed ${records.length} rows: ${results.added} added, ${results.removed} removed, ${results.errors.length} errors`
    )

    res.status(200).json({
      success: true,
      message: `Processed ${records.length} rows`,
      added: results.added,
      removed: results.removed,
      total_processed: records.length,
      errors: results.errors.length > 0 ? results.errors : undefined
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('[YesPlz Tag Mapping Upload] Error processing CSV: ' + errorMessage)
    
    if (error instanceof MedusaError) {
      res.status(error.type === MedusaError.Types.INVALID_DATA ? 400 : 500).json({
        error: error.type,
        message: error.message
      })
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: errorMessage
      })
    }
  }
}

