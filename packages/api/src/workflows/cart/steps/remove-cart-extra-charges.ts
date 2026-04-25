import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import CartOrderExtraChargeModuleService from '../../../modules/cart-order-extra-charge/service'
import { CART_ORDER_EXTRA_CHARGE_MODULE } from '../../../modules/cart-order-extra-charge'
import { CreateCartOrderExtraChargeDTO } from '../../../modules/cart-order-extra-charge/types/mutations'

export const removeCartExtraChargesStep = createStep(
  'remove-cart-extra-charges',
  async (cartId: string, { container }) => {
    const service = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)

    // Get existing extra charges for this cart with full data for rollback
    const existingCharges = await service.listCartOrderExtraCharges({
      cart_id: cartId
    })

    // Store the full charge data for rollback (not just IDs)
    const chargeDataForRollback = existingCharges.map(charge => ({
      id: charge.id,
      extra_charge_id: charge.extra_charge_id,
      extra_charge_rule_id: charge.extra_charge_rule_id,
      cart_id: charge.cart_id,
      order_set_id: charge.order_set_id,
      customer_id: charge.customer_id,
      name: charge.name,
      original_amount: charge.original_amount,
      fee_amount: charge.fee_amount,
      tax_total: charge.tax_total,
      shipping_total: charge.shipping_total,
      discount_total: charge.discount_total,
      total_amount: charge.total_amount,
      description: charge.description,
      metadata: charge.metadata,
      status: charge.status,
      created_at: charge.created_at,
      updated_at: charge.updated_at,
      // deleted_at: charge.deleted_at
    }))

    // Store the IDs for rollback
    const chargeIds = existingCharges.map(charge => charge.id)

    // Remove existing extra charges for this cart
    if (chargeIds.length > 0) {
      await service.softDeleteCartOrderExtraCharges(chargeIds)
    }

    return new StepResponse(chargeDataForRollback)
  },
  async (chargeDataForRollback: CreateCartOrderExtraChargeDTO[], { container }) => {
    // Rollback: restore the deleted charges
    if (chargeDataForRollback.length > 0) {
      const service = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)

      try {
        // Recreate the deleted charges with their original data
        for (const chargeData of chargeDataForRollback) {
          await service.createCartOrderExtraCharges({
            extra_charge_id: chargeData.extra_charge_id,
            extra_charge_rule_id: chargeData.extra_charge_rule_id,
            cart_id: chargeData.cart_id,
            order_set_id: chargeData.order_set_id,
            customer_id: chargeData.customer_id,
            name: chargeData.name,
            original_amount: chargeData.original_amount,
            fee_amount: chargeData.fee_amount,
            tax_total: chargeData.tax_total,
            shipping_total: chargeData.shipping_total,
            discount_total: chargeData.discount_total,
            total_amount: chargeData.total_amount,
            description: chargeData.description,
            metadata: chargeData.metadata,
            status: chargeData.status
          })
        }
      } catch (error) {
        console.error('Failed to restore extra charges during rollback:', error)
        // Re-throw the error to ensure the workflow knows the rollback failed
        throw new Error(`Rollback failed: Could not restore extra charges. Original error: ${error.message}`)
      }
    }
  }
)
