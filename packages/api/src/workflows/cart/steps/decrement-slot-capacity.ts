import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { SLOT_OVERRIDES_MODULE } from '../../../modules/slot-overrides'
import SlotOverrideModuleService from '../../../modules/slot-overrides/service'

type DecrementSlotCapacityInput = {
  order_set_id: string
}

type SlotCapacityCompensation = {
  slot_id: string
  previousCapacity: number
}

/**
 * Step to decrement slot capacity after order is successfully placed
 * This step:
 * 1. Fetches the order delivery detail to get slot_id
 * 2. Decrements the remaining_capacity of the slot by 1
 * 3. Provides compensation to restore capacity if workflow fails
 */
export const decrementSlotCapacityStep = createStep(
  {
    name: 'decrement-slot-capacity'
  },
  async (
    input: DecrementSlotCapacityInput,
    { container }
  ): Promise<StepResponse<void, SlotCapacityCompensation | null>> => {
    const { order_set_id } = input
    
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const slotOverrideService = container.resolve<SlotOverrideModuleService>(SLOT_OVERRIDES_MODULE)

      // Get order delivery detail to check if this is a slotted delivery
      const { data: [orderDeliveryDetail] } = await query.graph({
        entity: 'order_delivery_detail',
        fields: ['id', 'slot_id', 'delivery_type'],
        filters: { order_set_id }
      })

      // If no delivery detail or no slot_id, nothing to decrement (standard delivery)
      if (!orderDeliveryDetail || !orderDeliveryDetail.slot_id) {
        return new StepResponse(undefined, null)
      }

      const slot_id = orderDeliveryDetail.slot_id

      // Fetch current slot to get current capacity for compensation
      const { data: slots } = await query.graph({
        entity: 'slot_override',
        filters: { 
          id: slot_id,
          deleted_at: { $eq: null }
        },
        fields: ['id', 'remaining_capacity']
      })

      if (!slots || slots.length === 0) {
        // Slot not found - this shouldn't happen, but we log and continue
        console.warn(`Slot ${slot_id} not found when trying to decrement capacity`)
        return new StepResponse(undefined, null)
      }

      const slot = slots[0]
      const previousCapacity = slot.remaining_capacity

      // Decrement remaining capacity by 1
      const newCapacity = Math.max(0, previousCapacity - 1)
      await slotOverrideService.updateSlotOverrides({
        id: slot_id,
        remaining_capacity: newCapacity
      })

      console.log(`Decremented slot ${slot_id} capacity from ${previousCapacity} to ${newCapacity}`)

      // Return compensation data for rollback
      return new StepResponse(undefined, {
        slot_id,
        previousCapacity
      })

    } catch (error) {
      console.error('Error decrementing slot capacity:', error)
      // Don't throw - we don't want to fail the entire order if capacity update fails
      // The order is already placed at this point
      return new StepResponse(undefined, null)
    }
  },
  // Compensation function to restore capacity if workflow fails
  async (compensation: SlotCapacityCompensation | null, { container }) => {
    if (!compensation) {
      return // Nothing to rollback
    }

    try {
      const slotOverrideService = container.resolve<SlotOverrideModuleService>(SLOT_OVERRIDES_MODULE)

      // Restore the previous capacity
      await slotOverrideService.updateSlotOverrides({ id: compensation.slot_id, remaining_capacity: compensation.previousCapacity })
    } catch (error) { console.error('Error during rollback of slot capacity:', error) }
  }
)
