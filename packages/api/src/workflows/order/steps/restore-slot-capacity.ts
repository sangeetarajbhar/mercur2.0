import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { SLOT_OVERRIDES_MODULE } from '../../../modules/slot-overrides'
import SlotOverrideModuleService from '../../../modules/slot-overrides/service'

type RestoreSlotCapacityInput = {
  order_id: string
}

type SlotCapacityCompensation = {
  slot_id: string
  previousCapacity: number
}

/**
 * Step to restore slot capacity when an order is cancelled
 * This step:
 * 1. Fetches the order to get order_set_id
 * 2. Fetches the order delivery detail to get slot_id
 * 3. Increments the remaining_capacity of the slot by 1
 * 4. Provides compensation to undo the increment if workflow fails
 */
export const restoreSlotCapacityStep = createStep(
  {
    name: 'restore-slot-capacity'
  },
  async (
    input: RestoreSlotCapacityInput,
    { container }
  ): Promise<StepResponse<void, SlotCapacityCompensation | null>> => {
    const { order_id } = input
    
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const slotOverrideService = container.resolve<SlotOverrideModuleService>(SLOT_OVERRIDES_MODULE)

      // Get order to find order_set_id
      const { data: orders } = await query.graph({
        entity: 'orders',
        fields: ['id', 'order_set.id'],
        filters: { id: order_id }
      })

      if (!orders || orders.length === 0 || !orders[0].order_set) {
        // No order set, nothing to restore
        return new StepResponse(undefined, null)
      }

      const order = orders[0]
      const order_set_id = order.order_set?.id

      if (!order_set_id) {
        return new StepResponse(undefined, null)
      }

      // Query order_delivery_detail separately using order_set_id
      const { data: deliveryDetails } = await query.graph({
        entity: 'order_delivery_detail',
        fields: ['id', 'order_set_id', 'slot_id'],
        filters: { order_set_id }
      })

      if (!deliveryDetails || deliveryDetails.length === 0) {
        // No delivery detail, nothing to restore
        return new StepResponse(undefined, null)
      }

      const slot_id = deliveryDetails[0].slot_id

      // If no slot_id, this is not a slotted delivery
      if (!slot_id) {
        return new StepResponse(undefined, null)
      }

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
        console.warn(`Slot ${slot_id} not found when trying to restore capacity`)
        return new StepResponse(undefined, null)
      }

      const slot = slots[0]
      const previousCapacity = slot.remaining_capacity

      // Increment remaining capacity by 1 (restore)
      const newCapacity = previousCapacity + 1
      await slotOverrideService.updateSlotOverrides({
        id: slot_id,
        remaining_capacity: newCapacity
      })

      console.log(`Restored slot ${slot_id} capacity from ${previousCapacity} to ${newCapacity} due to order cancellation`)

      // Return compensation data for rollback
      return new StepResponse(undefined, {
        slot_id,
        previousCapacity
      })

    } catch (error) {
      console.error('Error restoring slot capacity:', error)
      // Don't throw - we don't want to fail the entire cancellation if capacity update fails
      return new StepResponse(undefined, null)
    }
  },
  // Compensation function to undo the capacity restoration if workflow fails
  async (compensation: SlotCapacityCompensation | null, { container }) => {
    if (!compensation) {
      return // Nothing to rollback
    }

    try {
      const slotOverrideService = container.resolve<SlotOverrideModuleService>(SLOT_OVERRIDES_MODULE)

      // Restore the previous capacity (undo the increment)
      await slotOverrideService.updateSlotOverrides({
        id: compensation.slot_id,
        remaining_capacity: compensation.previousCapacity
      })

      console.log(`Reverted slot ${compensation.slot_id} capacity back to ${compensation.previousCapacity}`)

    } catch (error) {
      console.error('Error during rollback of slot capacity restoration:', error)
      // Log but don't throw to avoid masking the original error
    }
  }
)

