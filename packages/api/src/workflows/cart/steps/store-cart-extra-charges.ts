import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import CartOrderExtraChargeModuleService from '../../../modules/cart-order-extra-charge/service'
import { CART_ORDER_EXTRA_CHARGE_MODULE } from '../../../modules/cart-order-extra-charge'
import { CreateCartOrderExtraChargeDTO } from '../../../modules/cart-order-extra-charge/types/mutations'

export const storeCartExtraChargesStep = createStep(
  'store-cart-extra-charges',
  async (input: {
    cartId: string
    applicableCharges: any[]
    cartContext: any
  }, { container }) => {
    const service = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)

    const createdCharges: any[] = []

    // Store each applicable charge in the cart_order_extra_charge table
    for (const charge of input.applicableCharges) {
      const originalAmount = input.cartContext.cart.subtotal
      const feeAmount = charge.amount
      const taxTotal = input.cartContext.cart.tax_total
      const shippingTotal = input.cartContext.cart.shipping_total
      const discountTotal = input.cartContext.cart.discount_total
      const totalAmount = feeAmount + shippingTotal + (originalAmount - discountTotal)
      const chargeData: CreateCartOrderExtraChargeDTO = {
        extra_charge_id: charge.id,
        extra_charge_rule_id: charge.rule_id || null, // Use actual rule ID if available
        cart_id: input.cartId,
        order_set_id: null, // while adding to cart, order_set_id will be null
        customer_id: input.cartContext.cart.customer_id, // It can be null if user is not login
        name: charge.name,
        original_amount: originalAmount,
        fee_amount: feeAmount,
        tax_total: taxTotal,
        shipping_total: shippingTotal,
        discount_total: discountTotal,
        total_amount:totalAmount,
        description: charge.description || `${charge.name} applied to cart`,
        metadata: {
          applied_rules: charge.applied_rules || [],
          charge_type: 'extra_charge',
          applied_at: new Date().toISOString()
        },
        status: 1
      }

      const createdCharge = await service.createCartOrderExtraCharges(chargeData)
      createdCharges.push(createdCharge)
    }

    return new StepResponse(createdCharges.map(charge => charge.id))
  },
  async (createdChargeIds: string[], { container }) => {
    // Rollback: delete the created charges
    if (!createdChargeIds?.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Cart order extra charge IDs are required for compensation'
      )
    }

    const service = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)
    await service.softDeleteCartOrderExtraCharges(createdChargeIds)
  }
)
