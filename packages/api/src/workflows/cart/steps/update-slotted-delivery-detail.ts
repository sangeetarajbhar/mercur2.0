import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/workflows-sdk'
import { upsertCartDeliveryDetail } from './helpers/upsert-cart-delivery-detail'
import { parseDateString, combineDateAndTime, validateDateTimeIsInFuture, validateDateIsTodayOrTomorrow, DELIVERY_TYPES } from './helpers/delivery-validation-utils'
import { fetchControlSettings } from '../../delivery-promise/steps/fetch-control-settings'

type UpdateSlottedDeliveryDetailInput = {
  cart_id: string
  slot_id: string
  delivery_type: string // 'standard' or 'home_trial'
}

type StepResult = {
  success: boolean
  error?: string
  data?: {
    cart_id: string
    delivery_type: string
    delivery_date: Date
    start_time: string
    end_time: string
  }
}

type SlotOverride = {
  id: string
  zone_id: string
  slot_date: string
  slot_key: string
  start_time: string
  end_time: string
  cut_off_time?: string
  total_capacity: number
  remaining_capacity: number
  is_active: boolean
}

/**
 * Step to validate and store slotted delivery details
 * This step:
 * 1. Fetches slot details from slot_override table using slot_id
 * 2. Validates that the slot date and end time haven't passed (is in future)
 * 3. Stores the delivery details with start_time and end_time from slot
 */
export const updateSlottedDeliveryDetailStep = createStep(
  {
    name: 'update-slotted-delivery-detail'
  },
  async (
    input: UpdateSlottedDeliveryDetailInput,
    { container }
  ): Promise<StepResponse<StepResult, StepResult>> => {
    const { cart_id, slot_id, delivery_type } = input
    
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)

      // Step 1: Fetch slot override details by slot_id
      const { data: slots } = await query.graph({
        entity: 'slot_override',
        filters: { 
          id: slot_id,
          deleted_at: { $eq: null }
        },
        fields: ['id', 'zone_id', 'slot_date', 'slot_key', 'start_time', 'end_time', 'cut_off_time', 'total_capacity', 'remaining_capacity', 'is_active']
      })

      if (!slots || slots.length === 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Slot with id ${slot_id} not found`
        )
      }

      const slot = slots[0] as SlotOverride

      // Step 2: Fetch zone to get location_id for control settings
      const { data: zones } = await query.graph({
        entity: 'zone',
        fields: ['id', 'location_id'],
        filters: { id: slot.zone_id }
      })

      if (!zones || zones.length === 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Zone with id ${slot.zone_id} not found`
        )
      }

      const zone = zones[0]

      // Step 3: Fetch control settings to check if slotted is enabled
      const controlSettings = await fetchControlSettings(query, slot.zone_id, zone.location_id)

      // Check if slotted delivery is enabled
      if (!controlSettings.isSlottedEnabled) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Slotted delivery is not available for this area. Slotted delivery is disabled.'
        )
      }

      // Step 4: Check if slot is active
      if (!slot.is_active) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Selected slot is not active'
        )
      }

      // Step 5: Check if slot has remaining capacity
      if (slot.remaining_capacity <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Selected slot is fully booked. Please select another slot.'
        )
      }

      // Step 6: Validate that slot date/time and cutoff have not passed
      const now = new Date()
      const slotDate = parseDateString(slot.slot_date)
      const slotEndDateTime = combineDateAndTime(slot.slot_date, slot.end_time)

      // Validate slot date is today or tomorrow
      validateDateIsTodayOrTomorrow(slot.slot_date, 'Slot date')

      // Validate slot end time is in future
      validateDateTimeIsInFuture(slotEndDateTime, 'Slot end time')

      // If slot is for today and cut_off_time is set, enforce cutoff
      // Extract today's date string directly (server is already in IST)
      const todayYear = now.getFullYear()
      const todayMonth = String(now.getMonth() + 1).padStart(2, '0')
      const todayDay = String(now.getDate()).padStart(2, '0')
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`
      
      if (slot.slot_date === todayStr && slot.cut_off_time) {
        // Create cutoff datetime
        const cutoffDateTime = combineDateAndTime(slot.slot_date, slot.cut_off_time)
        if (now >= cutoffDateTime) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Selected delivery slot is past cutoff time (${slot.cut_off_time}). Please select another slot.`
          )
        }
      }

      // Step 7: Upsert delivery detail (update if exists, create if not)
      await upsertCartDeliveryDetail(cart_id, {
        delivery_type: delivery_type, // Use delivery_type from input ('standard' or 'home_trial')
        delivery_date: slotDate,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_id: slot_id // Store slot_id for later capacity decrement
      }, container)

      return new StepResponse({ 
        success: true, 
        data: { 
          cart_id, 
          delivery_type: DELIVERY_TYPES.SLOTTED,
          delivery_date: slotDate,
          start_time: slot.start_time,
          end_time: slot.end_time
        } 
      })
    } catch (error) {
      // If it's a MedusaError, re-throw it to propagate to the user
      if (error instanceof MedusaError) {
        throw error
      }
      
      // For other errors, log and return error response
      console.error('Error updating slotted delivery detail:', error)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        error instanceof Error ? error.message : 'Failed to update slotted delivery details'
      )
    }
  }
)

