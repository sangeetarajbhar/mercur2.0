import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk";
import {
  UpdateCartOrderExtraChargeDTO
} from '../../../modules/cart-order-extra-charge/types/mutations'
import CartOrderExtraChargeModuleService from '../../../modules/cart-order-extra-charge/service'
import { CART_ORDER_EXTRA_CHARGE_MODULE } from '../../../modules/cart-order-extra-charge'

type OldRecord = {
  id: string
  order_set_id: string | null
}

export const updateCartOrderExtraChargeStep = createStep(
  'update-cart-order-extra-charge-step',
  async (data: UpdateCartOrderExtraChargeDTO, { container }) => {
    const service = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)

    // 1. Retrieve ALL cart order extra charge records for this cart where deleted_at is null
    // All records need to be updated with the new order_set_id
    const existingRecords = await service.listCartOrderExtraCharges(
      {
        cart_id: data.cart_id,
        deleted_at: null,
      },
      {
        order: { created_at: "DESC" }, // Order by creation date, newest first
      }
    )

    // Store old state for rollback
    const oldRecords: OldRecord[] = existingRecords.map(record => ({
      id: record.id,
      order_set_id: record.order_set_id
    }))

    // 2. Update ALL records with the new order_set_id
    if (existingRecords.length > 0) {
      // Prepare batch update data for all records
      const updateData = existingRecords.map(record => ({
        id: record.id,
        order_set_id: data.order_set_id
      }))

      // Batch update all records at once
      await service.updateCartOrderExtraCharges(updateData)
    } else {
      console.log(`No cart order extra charge records found for cart ${data.cart_id}`)
    }

    // Return the updated record IDs and old state for rollback
    return new StepResponse(
      {
        updatedIds: existingRecords.map(r => r.id),
        count: existingRecords.length
      },
      oldRecords
    )
  },
  async (oldRecords: OldRecord[], { container }) => {
    // Rollback: Revert each record to its previous order_set_id
    if (!oldRecords || oldRecords.length === 0) {
      console.log('No records to rollback for updateCartOrderExtraChargeStep')
      return
    }

    const service = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)

    // Revert using the MedusaService update method (accepts array)
    const rollbackData = oldRecords.map(record => ({
      id: record.id,
      order_set_id: record.order_set_id
    }))

    await service.updateCartOrderExtraCharges(rollbackData)
  }
)
