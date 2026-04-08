import { Knex } from 'knex'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework'
import { validateCartPincode } from '../steps/cart-promise/validate-cart-pincode'
import {
  fetchCartLineItems,
  fetchVariantInventory,
  fetchInventoryLevels,
  calculateInventoryAvailability,
  checkVariantServiceability,
  fetchZoneByPincode,
  fetchDeliveryOptions,
  buildCartPromiseResponse,
  buildCartPromiseErrorResponse,
  CartPromiseResponse,
  filterSlotsByOmniTiming
} from '../steps'

/**
 * Input parameters for getting cart delivery promise
 */
export type GetCartPromiseInput = {
  scope: MedusaContainer
  cart: any       // Cart data (contains id and shipping_address with pincode)
  postal_code: any
  lat?: number
  long?: number
}

/**
 * Successful delivery promise result structure
 */
export type DeliveryPromiseResult = {
  status?: boolean
  value: number
  unit: 'minutes'
  location_id: string
  eta_iso?: string
  message?: string
}

// Re-export CartPromiseResponse from the step
export type { CartPromiseResponse }

// Re-export types for backward compatibility
export type {
  OutOfStockItem,
  PartiallyAvailableItem,
  NonServiceableVariant,
  ServiceableVariant,
  DeliverySlot,
  AvailableSlots,
  DeliveryPromiseResult as InstantPromiseData
} from '../steps'

/**
 * Get delivery promise for a cart based on inventory availability and location
 *
 * This function:
 * 1. Retrieves cart line items and their variants
 * 2. Checks inventory availability for all items
 * 3. Per-variant serviceability check based on pincode and location
 * 4. Gets delivery promises based on location type (dark store or omni store)
 * 5. Calculates instant promise and available slots
 *
 * @param scope - Container for dependency resolution
 * @param cart - Complete cart data with items, 
 * id, and shipping_address (contains pincode)
 * @param postal_code - Postal code from request
 * @returns Promise with delivery information including instant promise and available slots
 */
export async function getCartPromise({ scope, cart, postal_code, lat, long }: GetCartPromiseInput) {
  try {
    // STEP 1: Validate cart pincode
    const pincode = validateCartPincode(cart, postal_code)

    // STEP 1: Resolve dependencies from container
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)
    const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex

    // STEP 9: Get zone by pincode and get dark store's child locations
    const zone = await fetchZoneByPincode(pincode, knex)

    if (!zone) {
      return buildCartPromiseErrorResponse(
        'NON_SERVICEABLE_AREA',
        'Area is not serviceable - Zone not found for pincode'
      )
    }

    // STEP 2: Fetch cart line items with seller information
    const lineItems = await fetchCartLineItems(cart, knex)

    if (lineItems.length === 0) {
      return buildCartPromiseErrorResponse(
        'NO_LINE_ITEMS',
        'Failed to get delivery promise - No line items found by given cart id'
      )
    }

    // Extract unique variant and seller IDs
    const variantIds = [...new Set(lineItems.map(item => item.variant_id))]
    const sellerIds = [...new Set(lineItems.map(item => item.seller_id))]

    // Effective seller for instant promise: if any Omni product in cart, use Omni so +60 mins; only-Zilo uses base promise
    const ziloSellerId = process.env.ZILO_SELLER_ID
    const hasOmni = sellerIds.some((id) => id !== ziloSellerId)
    const effectiveSellerId = hasOmni
      ? (sellerIds.find((id) => id !== ziloSellerId) ?? sellerIds[0])
      : (sellerIds[0] ?? null)
    const firstOmniItem = hasOmni
      ? lineItems.find((item) => item.seller_id !== ziloSellerId)
      : null

    // STEP 3: Fetch variant inventory mappings
    const variants = await fetchVariantInventory(variantIds, knex)

    if (variants.length === 0) {
      return buildCartPromiseErrorResponse(
        'NO_VARIANT_INVENTORY',
        'Failed to get delivery promise - No variant inventory item found'
      )
    }

    // Extract unique inventory item IDs
    const inventoryItemIds = [...new Set(variants.map(item => item.inventory_item_id))]


    const { data: childLocations } = await query.graph({
      entity: 'location_hierarchy',
      fields: ['child_location_id'],
      filters: {
        parent_location_id: zone.location_id,
        deleted_at: { $eq: null }
      }
    })

    const allLocationIdsInZone = [zone.location_id, ...(childLocations || []).map(location => location.child_location_id)]

    // STEP 4: Fetch inventory levels
    const inventoryLevels = await fetchInventoryLevels(inventoryItemIds, sellerIds, allLocationIdsInZone, knex)

    // STEP 5: Calculate inventory availability
    const availability = calculateInventoryAvailability(lineItems, inventoryLevels, variants)

    // // STEP 6: Preload all location data to avoid N+1 queries
    // removed as it was not used

    // STEP 7: Check variant serviceability
    const outOfStockVariantIds = new Set(availability.outOfStockItems.map(item => item.variant_id))
    const partiallyAvailableVariantIds = new Set(availability.partiallyAvailableItems.map(item => item.variant_id))

    const serviceabilityResult = checkVariantServiceability(
      lineItems,
      variants,
      inventoryLevels,
      // locationDataCache,
      outOfStockVariantIds,
      partiallyAvailableVariantIds
    )

    // STEP 8: Filter out variants with issues from serviceable variants
    const variantsWithIssues = new Set<string>()
    serviceabilityResult.nonServiceableVariants.forEach(item => variantsWithIssues.add(item.variant_id))
    availability.outOfStockItems.forEach(item => variantsWithIssues.add(item.variant_id))
    availability.partiallyAvailableItems.forEach(item => variantsWithIssues.add(item.variant_id))

    const finalServiceableVariants = serviceabilityResult.serviceableVariants.filter(item =>
      !variantsWithIssues.has(item.variant_id)
    )

    // Build a set of locations that are associated with finalServiceableVariants
    const finalServiceableVariantIds = new Set(finalServiceableVariants.map(v => v.variant_id))
    const finalServiceableLocationIds: string[] = []

    // Create variant-to-locations mapping
    const variantToLocationsMap = new Map<string, string[]>()
    variants.forEach(variant => {
      const locations = inventoryLevels
        .filter(level => {
          const availableQty = Math.max(0, level.stocked_quantity - level.reserved_quantity)
          return level.inventory_item_id === variant.inventory_item_id && availableQty > 0
        })
        .map(level => level.location_id)

      variantToLocationsMap.set(variant.variant_id, [...new Set(locations)])
    })

    for (const variantId of finalServiceableVariantIds) {
      const locations = variantToLocationsMap.get(variantId) || []
      locations.forEach(locId => {
        if (serviceabilityResult.serviceableLocationIds.has(locId) && !finalServiceableLocationIds.includes(locId)) {
          finalServiceableLocationIds.push(locId)
        }
      })
    }


    // STEP 10: Fetch delivery options (instant promise + available slots)
    // effectiveSellerId: Omni when any Omni in cart (instant +60 mins), Zilo when only-Zilo (base promise)
    const deliveryOptions = await fetchDeliveryOptions(zone, query, effectiveSellerId, {
      scope,
      variant_id: firstOmniItem?.variant_id ?? null,
    })

    // STEP 10b: When cart has any Omni products (mixed or only-Omni), filter slots by Omni location timing
    // See filterSlotsByOmniTiming step: uses first Omni line item to get minSlotStartTime from DB, then keeps only slots with start >= that time
    const slotsToUse = await filterSlotsByOmniTiming({
      scope,
      zone,
      lineItems,
      availableSlots: deliveryOptions.availableSlots,
      hasOmni,
      ziloSellerId
    })

    // STEP 11: Build and return comprehensive response
    return buildCartPromiseResponse(
      deliveryOptions.instantPromise,
      slotsToUse,
      finalServiceableVariants,
      serviceabilityResult.nonServiceableVariants,
      availability.outOfStockItems,
      availability.partiallyAvailableItems
    )

  } catch (error) {
    // Handle validation errors
    if (error instanceof Error) {
      if (error.message === 'PINCODE_DOES_NOT_MATCH') {
        return buildCartPromiseErrorResponse(
          'PINCODE_DOES_NOT_MATCH',
          'Pincode and postal code do not match'
        )
      }

      if (error.message === 'MISSING_PINCODE') {
        return buildCartPromiseErrorResponse(
          'MISSING_PINCODE',
          'No shipping address or pincode found'
        )
      }
    }

    // Generic error response
    return buildCartPromiseErrorResponse(
      'UNEXPECTED_ERROR',
      'Unable to get delivery promise, please try again later'
    )
  }
}
