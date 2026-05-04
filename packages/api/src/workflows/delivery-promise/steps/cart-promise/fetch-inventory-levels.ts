import { Knex } from 'knex'

export type InventoryLevel = {
  id: string
  inventory_item_id: string
  stocked_quantity: number
  reserved_quantity: number
  location_id: string
  stock_location_name: string
}

/**
 * Fetches inventory levels for inventory items filtered by seller
 * @param inventoryItemIds - Array of inventory item IDs
 * @param sellerIds - Array of seller IDs
 * @param knex - Knex database connection
 * @returns Array of inventory levels
 */
export async function fetchInventoryLevels(
  inventoryItemIds: string[],
  sellerIds: string[],
  locationIds: string[],
  knex: Knex
): Promise<InventoryLevel[]> {
  const inventoryLevels = await knex('inventory_level as il')
    .select(
      'il.id',
      'il.inventory_item_id',
      'il.stocked_quantity',
      'il.reserved_quantity',
      'il.location_id',
      'sl.name as stock_location_name'
    )
    .join('stock_location_stock_location_seller_seller as ssl', 'ssl.stock_location_id', 'il.location_id')
    .join('stock_location as sl', 'sl.id', 'il.location_id')
    .whereIn('ssl.seller_id', sellerIds)
    .whereIn('il.location_id', locationIds)
    .whereNull('ssl.deleted_at')
    .whereIn('il.inventory_item_id', inventoryItemIds)
    .whereNull('il.deleted_at')

  return inventoryLevels
}

