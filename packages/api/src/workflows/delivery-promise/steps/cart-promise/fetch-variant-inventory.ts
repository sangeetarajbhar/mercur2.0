import { Knex } from 'knex'

export type VariantInventoryMapping = {
  id: string
  inventory_item_id: string
  variant_id: string
}

/**
 * Fetches variant to inventory item mappings
 * @param variantIds - Array of variant IDs
 * @param knex - Knex database connection
 * @returns Array of variant inventory mappings
 */
export async function fetchVariantInventory(
  variantIds: string[],
  knex: Knex
): Promise<VariantInventoryMapping[]> {
  const variants = await knex('product_variant_inventory_item')
    .select('id', 'inventory_item_id', 'variant_id')
    .whereIn('variant_id', variantIds)
    .whereNull('deleted_at')

  return variants
}

