import type { CartLineItem } from './fetch-cart-line-items'
import type { VariantInventoryMapping } from './fetch-variant-inventory'
import type { InventoryLevel } from './fetch-inventory-levels'

export type NonServiceableVariant = {
  line_item_id: string
  cart_id: string
  variant_id: string
  seller_id: string
  reason: 'NO_INVENTORY_LOCATION' | 'NO_PINCODE_COVERAGE' | 'LOCATION_CLOSED'
}

export type ServiceableVariant = {
  line_item_id: string
  cart_id: string
  variant_id: string
  seller_id: string
  quantity: number
}

export type ServiceabilityResult = {
  serviceableVariants: ServiceableVariant[]
  nonServiceableVariants: NonServiceableVariant[]
  serviceableLocationIds: Set<string>
}

/**
 * Checks serviceability for each variant based on location coverage and pincode
 * @param lineItems - Cart line items to check
 * @param variants - Variant inventory mappings
 * @param inventoryLevels - Inventory levels at locations
 * // @param locationDataCache - Preloaded location data
 * @param outOfStockVariantIds - Set of variant IDs that are out of stock
 * @param partiallyAvailableVariantIds - Set of variant IDs with partial availability
 * @returns Serviceable and non-serviceable variants with locations
 */
export function checkVariantServiceability(
  lineItems: CartLineItem[],
  variants: VariantInventoryMapping[],
  inventoryLevels: InventoryLevel[],
  // locationDataCache: LocationDataCache,
  outOfStockVariantIds: Set<string>,
  partiallyAvailableVariantIds: Set<string>
): ServiceabilityResult {
  const nonServiceableVariants: NonServiceableVariant[] = []
  const serviceableVariants: ServiceableVariant[] = []
  const serviceableLocationIds = new Set<string>()

  // Create efficient variant-to-locations mapping
  const variantToLocationsMap = new Map<string, string[]>()
  variants.forEach(variant => {
    if (!variantToLocationsMap.has(variant.variant_id)) {
      variantToLocationsMap.set(variant.variant_id, [])
    }

    // Find locations with inventory for this variant
    const locationsWithInventory = inventoryLevels
      .filter(level => {
        const availableQty = Math.max(0, level.stocked_quantity - level.reserved_quantity)
        return level.inventory_item_id === variant.inventory_item_id && availableQty > 0
      })
      .map(level => level.location_id)

    variantToLocationsMap.get(variant.variant_id)!.push(...locationsWithInventory)
  })

  // Remove duplicates from variant locations
  variantToLocationsMap.forEach((locations, variantId) => {
    variantToLocationsMap.set(variantId, [...new Set(locations)])
  })

  // Check serviceability for each line item
  for (const item of lineItems) {
    // Skip variants that already have quantity issues
    if (outOfStockVariantIds.has(item.variant_id) || partiallyAvailableVariantIds.has(item.variant_id)) {
      continue
    }

    // Get locations for this variant using pre-built map (O(1) lookup)
    const variantLocationIds = variantToLocationsMap.get(item.variant_id) || []

    if (variantLocationIds.length === 0) {
      nonServiceableVariants.push({
        line_item_id: item.id,
        cart_id: item.cart_id,
        variant_id: item.variant_id,
        seller_id: item.seller_id,
        reason: 'NO_INVENTORY_LOCATION'
      })
      continue
    } else {
      serviceableVariants.push({
        line_item_id: item.id,
        cart_id: item.cart_id,
        variant_id: item.variant_id,
        seller_id: item.seller_id,
        quantity: item.quantity
      })
    }

  }

  return {
    serviceableVariants,
    nonServiceableVariants,
    serviceableLocationIds
  }
}

