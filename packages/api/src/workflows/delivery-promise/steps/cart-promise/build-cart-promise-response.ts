import type { OutOfStockItem, PartiallyAvailableItem } from './calculate-inventory-availability'
import type { NonServiceableVariant, ServiceableVariant } from './check-variant-serviceability'
import type { DeliveryPromiseResult as InstantPromiseData } from '../calculate-delivery-promise-from-zone'
import type { AvailableSlots } from './fetch-available-slots'

export type DeliveryPromiseMinutes = {
  base: number
  omni_extra: number
  total: number
}

export type DeliveryPromiseGroup = {
  promise_key: string
  kind: 'zilo' | 'omni' | 'mixed'  // mixed = group contains both zilo and omni items
  minutes: DeliveryPromiseMinutes
  instant_promise: InstantPromiseData | null
  available_slots: AvailableSlots
  line_item_ids: string[]
  locations_included: string[]  // List of all location IDs (DS + Omni) used in this group
}

export type CartPromiseResponse = {
  status: boolean
  /** Per-fulfillment-context groups (deduped compute, slots scoped per group). */
  deliveryPromiseGroupsData?: DeliveryPromiseGroup[]
  serviceable_variants: ServiceableVariant[]
  non_serviceable_variants: NonServiceableVariant[]
  out_of_stock_items: OutOfStockItem[]
  partially_available_items: PartiallyAvailableItem[]
  message?: string
  error?: string
}

/**
 * Builds the final cart promise response
 * @param serviceableVariants - List of serviceable variants
 * @param nonServiceableVariants - List of non-serviceable variants
 * @param outOfStockItems - List of out of stock items
 * @param partiallyAvailableItems - List of partially available items
 * @param deliveryPromiseGroupsData - Per-context delivery groups (instant + slots per fulfillment bucket)
 * @returns Complete cart promise response
 */
export function buildCartPromiseResponse(
  serviceableVariants: ServiceableVariant[],
  nonServiceableVariants: NonServiceableVariant[],
  outOfStockItems: OutOfStockItem[],
  partiallyAvailableItems: PartiallyAvailableItem[],
  deliveryPromiseGroupsData: DeliveryPromiseGroup[] = []
): CartPromiseResponse {
  const hasIssues = nonServiceableVariants.length + outOfStockItems.length + partiallyAvailableItems.length > 0
  
  return {
    status: true,
    deliveryPromiseGroupsData,
    serviceable_variants: serviceableVariants,
    non_serviceable_variants: nonServiceableVariants,
    out_of_stock_items: outOfStockItems,
    partially_available_items: partiallyAvailableItems,
    message: `Delivery promise calculated successfully. ${serviceableVariants.length} items serviceable. ${hasIssues ? 'Some items have issues.' : 'All items are serviceable.'}`
  }
}

/**
 * Builds an error response for cart promise
 * @param error - Error code
 * @param message - Error message
 * @param serviceableVariants - List of serviceable variants (optional)
 * @param nonServiceableVariants - List of non-serviceable variants (optional)
 * @param outOfStockItems - List of out of stock items (optional)
 * @param partiallyAvailableItems - List of partially available items (optional)
 * @returns Error cart promise response
 */
export function buildCartPromiseErrorResponse(
  error: string,
  message: string,
  serviceableVariants: ServiceableVariant[] = [],
  nonServiceableVariants: NonServiceableVariant[] = [],
  outOfStockItems: OutOfStockItem[] = [],
  partiallyAvailableItems: PartiallyAvailableItem[] = []
): CartPromiseResponse {
  return {
    status: false,
    message,
    error,
    serviceable_variants: serviceableVariants,
    non_serviceable_variants: nonServiceableVariants,
    out_of_stock_items: outOfStockItems,
    partially_available_items: partiallyAvailableItems
  }
}
