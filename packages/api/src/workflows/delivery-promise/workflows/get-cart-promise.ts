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
  buildCartPromiseResponse,
  buildCartPromiseErrorResponse,
  computeCartPromiseGroups
} from '../steps'
import { getLocationHierarchiesByParent } from '../../../shared/utils/location-hierarchy'
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

export type { CartPromiseResponse, DeliveryPromiseGroup } from '../steps'

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
    const lineItemTryAndBuyMap = new Map<string, boolean>()
    for (const item of Array.isArray(cart?.items) ? cart.items : []) {
      const cfg = item?.variant?.product?.product_configuration ?? item?.product?.product_configuration ?? null
      let isTryAndBuy = false
      if (typeof cfg?.is_try_and_buy === 'boolean') {
        isTryAndBuy = cfg.is_try_and_buy
      } else if (typeof item?.metadata?.is_try_and_buy === 'boolean') {
        isTryAndBuy = item.metadata.is_try_and_buy
      }
      if (item?.id) {
        lineItemTryAndBuyMap.set(item.id, isTryAndBuy)
      }
    }

    // STEP 1: Validate cart pincode
    const pincode = validateCartPincode(cart, postal_code)

    // STEP 1: Resolve dependencies from container
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)
    const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex

    // STEP 9: Get zone by pincode and get dark store's child locations
    const zone = await fetchZoneByPincode(pincode)

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

    const childLocationsListwithPromiseMinutes = await getLocationHierarchiesByParent(query, zone.location_id)
    const omniPromiseMinutesByChildLocation = new Map<string, number>(
      (childLocationsListwithPromiseMinutes || []).map((location) => [
        location.child_location_id,
        typeof location.promise_minutes === 'number' ? Math.max(0, location.promise_minutes) : 0
      ])
    )

    const allLocationIdsInZone = [zone.location_id, ...(childLocationsListwithPromiseMinutes || []).map(location => location.child_location_id)]

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


    // Eligible lines: serviceable + in-stock (no OOS / partial / non-serviceable issues)
    // Promise is ONLY calculated for serviceable products
    const eligibleSvByLineId = new Set(finalServiceableVariants.map((sv) => sv.line_item_id))
    const eligibleLineItems = lineItems.filter((li) => eligibleSvByLineId.has(li.id))

    // If no eligible items, return error - promise only for serviceable products
    if (eligibleLineItems.length === 0) {
      try {
        const logger = scope.resolve('logger') as {
          warn: (msg: string, meta?: Record<string, unknown>) => void
        }
        logger.warn('cart_delivery_promise:NO_PROMISE_AVAILABLE', {
          cart_id: cart?.id,
          line_item_count: lineItems.length,
          final_serviceable_count: finalServiceableVariants.length,
          out_of_stock_count: availability.outOfStockItems.length,
          partially_available_count: availability.partiallyAvailableItems.length,
          non_serviceable_count: serviceabilityResult.nonServiceableVariants.length
        })
      } catch {
        // logger optional in tests
      }
      return buildCartPromiseErrorResponse(
        'NO_PROMISE_AVAILABLE',
        'No serviceable in-stock items eligible for delivery promise',
        [],
        serviceabilityResult.nonServiceableVariants,
        availability.outOfStockItems,
        availability.partiallyAvailableItems
      )
    }

    const { deliveryPromiseGroupsData } = await computeCartPromiseGroups({
      scope,
      zone,
      query,
      lineItems: eligibleLineItems,
      inventoryLevels,
      variants,
      omniPromiseMinutesByChildLocation,
      lineItemTryAndBuyMap
    })

    return buildCartPromiseResponse(
      finalServiceableVariants,
      serviceabilityResult.nonServiceableVariants,
      availability.outOfStockItems,
      availability.partiallyAvailableItems,
      deliveryPromiseGroupsData
    )

  } catch (error) {

    console.error('Error in getCartPromise:', error)
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
