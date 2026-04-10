import type { OutOfStockItem, PartiallyAvailableItem } from './calculate-inventory-availability'
import type { NonServiceableVariant, ServiceableVariant } from './check-variant-serviceability'
import type { DeliveryPromiseResult as InstantPromiseData } from '../calculate-delivery-promise-from-zone'
import type { AvailableSlots } from './fetch-available-slots'

export type CartPromiseResponse = {
  status: boolean
  instant_promise?: InstantPromiseData | null // Always included, can be null
  available_slots?: AvailableSlots // Always included with today/tomorrow keys
  serviceable_variants: ServiceableVariant[]
  non_serviceable_variants: NonServiceableVariant[]
  out_of_stock_items: OutOfStockItem[]
  partially_available_items: PartiallyAvailableItem[]
  message?: string
  error?: string
}

/**
 * Builds the final cart promise response
 * @param instantPromise - Instant delivery promise data
 * @param availableSlots - Available delivery slots grouped by today/tomorrow
 * @param serviceableVariants - List of serviceable variants
 * @param nonServiceableVariants - List of non-serviceable variants
 * @param outOfStockItems - List of out of stock items
 * @param partiallyAvailableItems - List of partially available items
 * @returns Complete cart promise response
 */
export function buildCartPromiseResponse(
  instantPromise: InstantPromiseData | null,
  availableSlots: AvailableSlots,
  serviceableVariants: ServiceableVariant[],
  nonServiceableVariants: NonServiceableVariant[],
  outOfStockItems: OutOfStockItem[],
  partiallyAvailableItems: PartiallyAvailableItem[]
): CartPromiseResponse {
  const hasIssues = nonServiceableVariants.length + outOfStockItems.length + partiallyAvailableItems.length > 0
  
  return {
    status: true,
    instant_promise: instantPromise, // Always include, even if null
    available_slots: availableSlots, // Always include with today/tomorrow keys (even if empty arrays)
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

