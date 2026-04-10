import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

/**
 * Link tags to a product
 * Directly inserts into product_tags junction table
 * This handles the many-to-many relationship between products and tags
 */
export async function linkTagsToProduct(
  container: MedusaContainer,
  productId: string,
  tagIds: string[]
): Promise<void> {
  if (!tagIds || tagIds.length === 0) {
    return // No tags to link
  }

  try {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    
    // Check existing mappings to avoid duplicates
    const existingMappings = await knex('product_tags')
      .where('product_id', productId)
      .whereIn('product_tag_id', tagIds)
      .select('product_tag_id')
    
    const existingTagIds = new Set(existingMappings.map((m: { product_tag_id: string }) => m.product_tag_id))
    const newTagIds = tagIds.filter(tagId => !existingTagIds.has(tagId))
    
    if (newTagIds.length === 0) {
      // All tags already linked
      return
    }
    
    // Insert new tag mappings into product_tags junction table
    const insertData = newTagIds.map(tagId => ({
      product_id: productId,
      product_tag_id: tagId
    }))
    
    await knex('product_tags').insert(insertData)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[LinkTagsToProduct] Error linking tags to product ${productId}:`, errorMessage)
    throw error
  }
}

