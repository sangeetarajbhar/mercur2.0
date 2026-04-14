import type { CartLineItem } from './fetch-cart-line-items'
import type { VariantInventoryMapping } from './fetch-variant-inventory'
import type { InventoryLevel } from './fetch-inventory-levels'

export type OutOfStockItem = {
  line_item_id: string
  cart_id: string
  variant_id: string
  seller_id: string
  reason: string
}

export type PartiallyAvailableItem = {
  line_item_id: string
  cart_id: string
  variant_id: string
  requested_quantity: number
  available_quantity: number
}

export type InventoryAvailability = {
  outOfStockItems: OutOfStockItem[]
  partiallyAvailableItems: PartiallyAvailableItem[]
  variantAvailableQuantities: Map<string, number>
  inventoryItemAvailableQuantities: Map<string, number>
  locationIds: string[]
}

/**
 * Calculates inventory availability and identifies stock issues
 * @param lineItems - Cart line items
 * @param inventoryLevels - Inventory levels from stock locations
 * @param variants - Variant to inventory item mappings
 * @returns Availability data with stock issues identified
 */
export function calculateInventoryAvailability(
  lineItems: CartLineItem[],
  inventoryLevels: InventoryLevel[],
  variants: VariantInventoryMapping[]
): InventoryAvailability {
  // Process inventory data and identify locations with available stock
  const inventoryItemAvailableQuantities = new Map<string, number>()
  const locationIds = new Set<string>()

  // Process inventory levels in a single pass
  inventoryLevels.forEach(level => {
    const availableQty = Math.max(0, level.stocked_quantity - level.reserved_quantity)

    // Track locations with available inventory
    if (availableQty > 0) {
      locationIds.add(level.location_id)

      // Update available quantity for this inventory item
      const currentTotal = inventoryItemAvailableQuantities.get(level.inventory_item_id) || 0
      inventoryItemAvailableQuantities.set(level.inventory_item_id, currentTotal + availableQty)
    }
  })

  // Map to store available quantity per variant
  const variantAvailableQuantities = new Map<string, number>()
  
  // Map inventory item quantities to variants
  variants.forEach(variant => {
    const availableQty = inventoryItemAvailableQuantities.get(variant.inventory_item_id) || 0
    variantAvailableQuantities.set(variant.variant_id, availableQty)
  })

  // Identify out of stock items
  const outOfStockItems: OutOfStockItem[] = []
  const partiallyAvailableItems: PartiallyAvailableItem[] = []

  // Check if requested quantity exceeds available quantity for any item
  for (const item of lineItems) {
    const availableQty = variantAvailableQuantities.get(item.variant_id) || 0
    const requestedQty = item.quantity

    if (requestedQty > availableQty && availableQty > 0) {
      partiallyAvailableItems.push({
        line_item_id: item.id,
        cart_id: item.cart_id,
        variant_id: item.variant_id,
        requested_quantity: requestedQty,
        available_quantity: availableQty
      })
    }

    if (availableQty === 0) {
      outOfStockItems.push({
        line_item_id: item.id,
        cart_id: item.cart_id,
        variant_id: item.variant_id,
        seller_id: item.seller_id,
        reason: 'OUT_OF_STOCK'
      })
    }
  }

  return {
    outOfStockItems,
    partiallyAvailableItems,
    variantAvailableQuantities,
    inventoryItemAvailableQuantities,
    locationIds: Array.from(locationIds)
  }
}

