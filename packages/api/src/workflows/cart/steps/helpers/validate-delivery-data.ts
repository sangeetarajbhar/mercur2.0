import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework'
import { Knex } from 'knex'
import { RemoteQueryFunction } from '@medusajs/framework/types'
import { fetchZoneByPincode } from '../../../delivery-promise/steps/cart-promise/fetch-zone-by-pincode'
import { fetchControlSettings } from '../../../delivery-promise/steps/fetch-control-settings'
import { getTodayIST } from '../../../delivery-promise/utils/date-time-utils'
import { combineDateAndTime, isSlottedDelivery, isInstantDelivery } from './delivery-validation-utils'

type DeliveryDetail = {
    id: string
    cart_id: string
    delivery_type: string
    delivery_date: Date
    start_time: string
    end_time: string
    slot_id?: string | null
}

type SlotOverride = {
    id: string
    zone_id: string
    slot_date: string
    start_time: string
    end_time: string
    cut_off_time?: string | null
    total_capacity: number
    remaining_capacity: number
    is_active: boolean
}

type ValidationResult = {
    isValid: boolean
    error?: string
}

/**
 * Helper to extract pincode from cart (shipping_address or input)
 */
export function getCartAddressPincode(
    cart: { shipping_address?: { postal_code?: string } } | null | undefined,
    input?: { shipping_address?: { postal_code?: string } }
): string | null {
    // Priority: input shipping_address > cart shipping_address
    const pincode = input?.shipping_address?.postal_code || cart?.shipping_address?.postal_code
    return pincode || null
}

/**
 * Helper to check if an item has is_try_and_buy enabled
 * Matches the logic from enrichCartWithDeliveryOptions
 */
export function getIsTryAndBuyFromItem(item: any): boolean {
    const cfg =
        item?.variant?.product?.product_configuration ??
        item?.product?.product_configuration ??
        null

    if (typeof cfg?.is_try_and_buy === "boolean") {
        return cfg.is_try_and_buy
    }

    // Fallback if we already store this flag on metadata
    if (typeof item?.metadata?.is_try_and_buy === "boolean") {
        return item.metadata.is_try_and_buy
    }

    return false
}

/**
 * Validates if home trial is eligible for the cart
 * Home trial is eligible only if ALL items in the cart have is_try_and_buy === true
 */
function validateHomeTrialEligibility(
    cartItems: any[] | null | undefined
): ValidationResult {
    try {
        if (!cartItems || cartItems.length === 0) {
            return {
                isValid: false,
                error: 'Cart has no items. Home trial is not available for empty carts.'
            }
        }

        // Check if all items have is_try_and_buy === true
        const allItemsTryAndBuy = cartItems.every((item: any) => getIsTryAndBuyFromItem(item) === true)

        if (!allItemsTryAndBuy) {
            return {
                isValid: false,
                error: 'Home trial is not eligible for this cart. All items must have try-and-buy enabled.'
            }
        }

        return { isValid: true }
    } catch (error) {
        console.error('Error validating home trial eligibility:', error)
        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Failed to validate home trial eligibility'
        }
    }
}

/**
 * Fetches a slot by ID from the database
 */
async function fetchSlotById(
    slotId: string,
    query: RemoteQueryFunction
): Promise<SlotOverride | null> {
    const { data: slots } = await query.graph({
        entity: 'slot_override',
        filters: {
            id: slotId,
            deleted_at: { $eq: null }
        },
        fields: ['id', 'zone_id', 'slot_date', 'start_time', 'end_time', 'cut_off_time', 'total_capacity', 'remaining_capacity', 'is_active']
    })

    if (!slots || slots.length === 0) {
        return null
    }

    return slots[0] as SlotOverride
}

/**
 * Validates slot availability (active, capacity, cutoff time)
 */
function validateSlotAvailability(
    slot: SlotOverride,
    zoneId: string,
    now: Date
): ValidationResult {
    // Check if slot is active
    if (!slot.is_active) {
        return {
            isValid: false,
            error: 'Selected slot is not active'
        }
    }

    // Check if slot has capacity
    if (slot.remaining_capacity <= 0) {
        return {
            isValid: false,
            error: 'Selected slot is fully booked. Please select another slot.'
        }
    }

    // Check if slot belongs to the zone
    if (slot.zone_id !== zoneId) {
        return {
            isValid: false,
            error: 'Selected slot is not available for the cart address'
        }
    }

    // Check if slot cutoff time has not passed (if slot is for today and has cutoff_time)
    const todayStr = getTodayIST(now)
    if (slot.slot_date === todayStr && slot.cut_off_time) {
        const cutoffDateTime = combineDateAndTime(slot.slot_date, slot.cut_off_time)
        if (now >= cutoffDateTime) {
            return {
                isValid: false,
                error: `Selected delivery slot is past cutoff time (${slot.cut_off_time}). Please select another slot.`
            }
        }
    }

    return { isValid: true }
}

/**
 * Validates existing delivery data from DB
 */
export async function validateExistingDeliveryData(
    deliveryDetail: DeliveryDetail,
    cartPincode: string,
    scope: MedusaContainer,
    cartItems?: any[] | null
): Promise<ValidationResult> {
    try {
        const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex
        const query = scope.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction
        const now = new Date()

        // Get zone for current cart address
        const zone = await fetchZoneByPincode(cartPincode, knex)
        if (!zone) {
            return {
                isValid: false,
                error: 'Zone not found for current cart address'
            }
        }

        // Calculate date strings once to avoid duplication
        const todayStr = getTodayIST(now)
        const tomorrow = new Date(now)
        tomorrow.setDate(now.getDate() + 1)
        const tomorrowStr = getTodayIST(tomorrow)
        const deliveryDateStr = getTodayIST(deliveryDetail.delivery_date)

        // For instant delivery
        if (isInstantDelivery(deliveryDetail.slot_id)) {
            // Check if instant delivery is enabled for current zone
            const controlSettings = await fetchControlSettings(query, zone.id, zone.location_id)
            if (!controlSettings.isInstantEnabled) {
                return {
                    isValid: false,
                    error: 'Delivery data is invalid for the current address - instant delivery is not available for this zone'
                }
            }

            // Check if delivery_date is today
            if (deliveryDateStr !== todayStr) {
                return {
                    isValid: false,
                    error: 'Delivery data is no longer valid - delivery date has passed'
                }
            }

            // Check if end_time is in the future (must be future time)
            const endDateTime = combineDateAndTime(deliveryDetail.delivery_date, deliveryDetail.end_time)
            if (endDateTime <= now) {
                return {
                    isValid: false,
                    error: 'Delivery data is no longer valid - delivery time has passed'
                }
            }
        }

        // For slotted delivery
        if (isSlottedDelivery(deliveryDetail.slot_id) && deliveryDetail.slot_id) {
            // Check if delivery_date is today or tomorrow

            if (deliveryDateStr !== todayStr && deliveryDateStr !== tomorrowStr) {
                return {
                    isValid: false,
                    error: 'Delivery data is no longer valid - delivery date has passed'
                }
            }

            // Fetch and validate slot
            const slot = await fetchSlotById(deliveryDetail.slot_id, query)
            if (!slot) {
                return {
                    isValid: false,
                    error: 'Selected slot is no longer available'
                }
            }

            // Validate slot availability
            const slotValidation = validateSlotAvailability(slot, zone.id, now)
            if (!slotValidation.isValid) {
                // Adjust error message for existing delivery data context
                if (slotValidation.error?.includes('not active') || slotValidation.error?.includes('fully booked')) {
                    return {
                        isValid: false,
                        error: 'Selected slot is no longer available'
                    }
                }
                if (slotValidation.error?.includes('cutoff time')) {
                    return {
                        isValid: false,
                        error: 'Selected slot is past cutoff time'
                    }
                }
                if (slotValidation.error?.includes('not available for the cart address')) {
                    return {
                        isValid: false,
                        error: 'Delivery data is invalid for the current address - zone mismatch'
                    }
                }
                return slotValidation
            }
        }

        // Validate home trial eligibility if delivery_type is 'home_trial'
        if (deliveryDetail.delivery_type === 'home_trial') {
            const homeTrialValidation = validateHomeTrialEligibility(cartItems)
            if (!homeTrialValidation.isValid) {
                return homeTrialValidation
            }
        }

        return { isValid: true }
    } catch (error) {
        console.error('Error validating existing delivery data:', error)
        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Failed to validate delivery data'
        }
    }
}

/**
 * Validates delivery data from request payload
 */
export async function validatePayloadDeliveryData(
    deliveryDetail: {
        delivery_type: string
        slot_id?: string | null
    },
    cartPincode: string,
    scope: MedusaContainer,
    cartId: string,
    cartItems: any[] | null | undefined
): Promise<ValidationResult> {
    try {
        const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex
        const query = scope.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction
        const now = new Date()

        // Get zone for cart address
        const zone = await fetchZoneByPincode(cartPincode, knex)
        if (!zone) {
            return {
                isValid: false,
                error: 'Zone not found for cart address'
            }
        }

        // If slot_id provided (slotted delivery)
        if (isSlottedDelivery(deliveryDetail.slot_id) && deliveryDetail.slot_id) {
            // Fetch slot
            const slot = await fetchSlotById(deliveryDetail.slot_id, query)
            if (!slot) {
                return {
                    isValid: false,
                    error: `Slot with id ${deliveryDetail.slot_id} not found`
                }
            }

            // Validate slot availability
            const slotValidation = validateSlotAvailability(slot, zone.id, now)
            if (!slotValidation.isValid) {
                return slotValidation
            }
        }

        // Validate home trial eligibility if delivery_type is 'home_trial'
        if (deliveryDetail.delivery_type === 'home_trial') {
            const homeTrialValidation = validateHomeTrialEligibility(cartItems)
            if (!homeTrialValidation.isValid) {
                return homeTrialValidation
            }
        }

        // If instant delivery (no slot_id)
        if (isInstantDelivery(deliveryDetail.slot_id)) {
            // Validate instant delivery is enabled for zone
            const controlSettings = await fetchControlSettings(query, zone.id, zone.location_id)

            if (!controlSettings.isInstantEnabled) {
                return {
                    isValid: false,
                    error: 'Standard delivery is not available for this area. Instant delivery is disabled.'
                }
            }

            // Validate delivery time will be in the future (calculate ETA and ensure it's future time)
            // Fetch instant promise to calculate ETA
            const { data: instantPromisesData } = await query.graph({
                entity: 'instant_promise',
                fields: ['promise_minutes', 'return_lead_minutes'],
                filters: {
                    zone_id: zone.id,
                    is_active: true,
                    deleted_at: null
                }
            })

            if (instantPromisesData && instantPromisesData.length > 0) {
                const sortedPromises = (instantPromisesData || []).sort((a: { promise_minutes: number }, b: { promise_minutes: number }) =>
                    a.promise_minutes - b.promise_minutes
                )
                const instantPromise = sortedPromises[0]

                if (instantPromise) {
                    // Calculate ETA
                    const basePromiseMinutes = instantPromise.promise_minutes
                    const delayMinutes = controlSettings.delayMinutes
                    const actualPromiseMinutes = basePromiseMinutes + delayMinutes

                    // Calculate ETA using current time
                    const eta = new Date(now.getTime() + actualPromiseMinutes * 60000)

                    // Check if ETA is in the future
                    if (eta <= now) {
                        return {
                            isValid: false,
                            error: 'Delivery time must be in the future'
                        }
                    }
                }
            }
        }

        return { isValid: true }
    } catch (error) {
        console.error('Error validating payload delivery data:', error)
        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Failed to validate delivery data'
        }
    }
}
