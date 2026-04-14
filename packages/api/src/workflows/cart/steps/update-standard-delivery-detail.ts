import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { Knex } from 'knex'
import { fetchZoneByPincode } from '../../../workflows/delivery-promise/steps/cart-promise/fetch-zone-by-pincode'
import { upsertCartDeliveryDetail } from './helpers/upsert-cart-delivery-detail'
import { formatTimeAsHHMM, DELIVERY_TYPES } from './helpers/delivery-validation-utils'
import { fetchControlSettings } from '../../../workflows/delivery-promise/steps/fetch-control-settings'
import { fetchLocationOperatingHours } from '../../../workflows/delivery-promise/steps/fetch-location-hours'
import { addMinutes, parseHHMM, getTodayIST } from '../../../workflows/delivery-promise/utils/date-time-utils'


type InstantPromise = {
  promise_minutes: number
  return_lead_minutes: number
  promise_text: string
}

type UpdateStandardDeliveryDetailInput = {
  cart_id: string
  postal_code: string
  delivery_type: string // 'standard' or 'home_trial'
}

type StepResult = {
  success: boolean
  error?: string
  data?: {
    cart_id: string
    delivery_type: string
    start_time: string
    end_time: string
    promise_minutes: number
    return_lead_minutes: number
    delay_minutes: number
    has_delay: boolean
  }
}

/**
 * Step to calculate and store standard delivery promise details
 * This step:
 * 1. Fetches the zone based on the pincode
 * 2. Fetches control settings and instant promise for the zone
 * 3. If cart has any Omni products, adds OMNI_SELLER_EXTRA_MINUTES (+60) to promise (same as get-cart-promise)
 * 4. Calculates delivery time and ETA; validates store hours and same-day delivery
 * 5. Stores the delivery details with start_time (current time) and end_time (current time + promise duration, including +60 for Omni when applicable)
 */
export const updateStandardDeliveryDetailStep = createStep(
  {
    name: 'update-standard-delivery-detail'
  },
  async (
    input: UpdateStandardDeliveryDetailInput,
    { container }
  ): Promise<StepResponse<StepResult, StepResult>> => {
    const { cart_id, postal_code, delivery_type } = input
    
    try {
      const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex

      // Step 1: Get zone by pincode
      const zone = await fetchZoneByPincode(postal_code, knex)
      
      if (!zone) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Zone not found for pincode: ${postal_code}`
        )
      }

      // Step 2: Fetch control settings to check if instant is enabled
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const controlSettings = await fetchControlSettings(query, zone.id, zone.location_id)

      // Check if instant delivery is enabled
      if (!controlSettings.isInstantEnabled) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Standard delivery is not available for this area. Instant delivery is disabled.'
        )
      }

      // Fetch location operating hours for darkstore end time validation
      const locationHours = await fetchLocationOperatingHours(query, zone.location_id)

      // Step 3: Fetch instant promise details for this zone
      const { data: instantPromisesData } = await query.graph({
        entity: 'instant_promise',
        fields: ['promise_minutes', 'return_lead_minutes', 'promise_text'],
        filters: {
          zone_id: zone.id,
          is_active: true,
          deleted_at: null
        }
      })

      const sortedPromises = (instantPromisesData || []).sort((a: InstantPromise, b: InstantPromise) => 
        a.promise_minutes - b.promise_minutes
      )
      const instantPromise = sortedPromises[0] as InstantPromise

      if (!instantPromise) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'No instant promise configured for this zone'
        )
      }

      // Step 4: Check if cart has any Omni products (add +60 mins for Omni, same as get-cart-promise / calculate-instant-delivery)
      const cartLineItems = await knex('cart_line_item')
        .select('id')
        .where({ cart_id })
        .whereNull('deleted_at')
      const lineItemIds = (cartLineItems || []).map((row: { id: string }) => row.id)
      let sellerIds: string[] = []
      if (lineItemIds.length > 0) {
        const sellerRows = await knex('seller_seller_cart_line_item')
          .select('seller_id')
          .whereIn('line_item_id', lineItemIds)
          .whereNull('deleted_at')
        sellerIds = [...new Set((sellerRows || []).map((row: { seller_id: string }) => row.seller_id))]
      }
      const ziloSellerId = process.env.ZILO_SELLER_ID
      const hasOmni = sellerIds.some((id) => id !== ziloSellerId)
      const omniExtraMinutes = hasOmni ? parseInt(process.env.OMNI_SELLER_EXTRA_MINUTES || '0', 10) : 0

      // Step 5: Calculate total delivery time including delay and Omni +60 when applicable
      // Server is already in IST, so use current time directly (no conversion needed)
      const now = new Date() // Current time in IST (server timezone)
      const basePromiseMinutes = instantPromise.promise_minutes
      const returnLeadMinutes = instantPromise.return_lead_minutes
      const delayMinutes = controlSettings.delayMinutes
      // const totalPromiseMinutes = basePromiseMinutes + returnLeadMinutes + delayMinutes
      // const actualPromiseMinutes = basePromiseMinutes + delayMinutes
      const totalPromiseMinutes = basePromiseMinutes + returnLeadMinutes + delayMinutes + omniExtraMinutes
      const actualPromiseMinutes = basePromiseMinutes + delayMinutes + omniExtraMinutes

      // Calculate ETA using current time (already in IST) - all calculations in IST
      const eta = addMinutes(now, actualPromiseMinutes)

      // Get today's date string in IST for validation and storage
      const todayDateStr = getTodayIST(now)
      const etaDateStr = getTodayIST(eta)
      
      // CRITICAL CHECK: If ETA crosses to tomorrow, reject the order
      // Standard/instant delivery should only be for TODAY
      // Example: Current: 11:30 PM, promise_minutes: 120, ETA: 1:30 AM tomorrow
      // In this case, user should select slotted delivery (tomorrow's slot) instead
      if (etaDateStr !== todayDateStr) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Standard delivery not available - delivery time would be after midnight. Please select a delivery slot for tomorrow.'
        )
      }

      // Validate store operating hours (all times in IST - server is already in IST)
      
      // Check if store has opened
      if (locationHours.startTime) {
        const locationStart = parseHHMM(locationHours.startTime)
        if (locationStart) {
          // Server is already in IST, create date directly
          const [year, month, day] = todayDateStr.split('-').map(Number)
          const startToday = new Date(year, month - 1, day, locationStart.h, locationStart.m, 0, 0)
          
          // Check if current time (already in IST) is before store opening
          if (now < startToday) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              'Delivery cannot be Standard as store is not open yet'
            )
          }
        }
      }
      
      // Check if delivery would exceed store closing time
      if (locationHours.endTime) {
        const locationEnd = parseHHMM(locationHours.endTime)
        if (locationEnd) {
          // Server is already in IST, create date directly
          const [year, month, day] = todayDateStr.split('-').map(Number)
          const endToday = new Date(year, month - 1, day, locationEnd.h, locationEnd.m, 0, 0)
          
          // Calculate ETA with total promise minutes (including return lead time) - all in IST
          const etaWithTotalMinutes = addMinutes(now, totalPromiseMinutes)
          
          // Check if current time (already in IST) is past store closing OR delivery time exceeds store closing
          if (now >= endToday) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              'Delivery cannot be Standard as store is closed'
            )
          }
          
          if (etaWithTotalMinutes > endToday) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              'Delivery cannot be Standard as delivery would exceed store closing time'
            )
          }
        }
      }
      
      const startTime = formatTimeAsHHMM(now)
      const endTime = formatTimeAsHHMM(eta)

      // Create delivery_date using TODAY's date (not ETA date)
      // Standard/instant delivery is always for the same day the order is placed
      // const deliveryDate = parseDateString(todayDateStr)

      // Step 6: Upsert delivery detail (update if exists, create if not); end_time reflects +60 for Omni when applicable
      await upsertCartDeliveryDetail(cart_id, {
        delivery_type: delivery_type, // Use delivery_type from input ('standard' or 'home_trial')
        delivery_date: now, // Always TODAY for standard/instant delivery
        start_time: startTime,
        end_time: endTime,
        slot_id: null
      }, container)

      return new StepResponse({ 
        success: true, 
        data: { 
          cart_id, 
          delivery_type: DELIVERY_TYPES.STANDARD,
          start_time: startTime,
          end_time: endTime,
          promise_minutes: totalPromiseMinutes,
          return_lead_minutes: returnLeadMinutes,
          delay_minutes: delayMinutes,
          has_delay: delayMinutes > 0
        } 
      })
    } catch (error) {
      // Re-throw MedusaError to propagate to API
      if (error instanceof MedusaError) {
        throw error
      }
      
      // Wrap other errors in MedusaError
      console.error('Error updating standard delivery detail:', error)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        error instanceof Error ? error.message : 'Failed to update standard delivery details'
      )
    }
  }
)

