import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import CartOrderExtraChargeModuleService from '../../../modules/cart-order-extra-charge/service'
import { CART_ORDER_EXTRA_CHARGE_MODULE } from '../../../modules/cart-order-extra-charge'
import { roundToTwoDecimals } from '../../../shared/utils/calculate-discount-amount'

export const refetchOrderDetailsWithExtraChargesStep = createStep(
  'refetch-order-details-with-extra-charges-step',
  async (input: {
    cartId: string,
    order: any
  }, { container }) => {
    const { cartId, order } = input

    // Fetch extra charges for this cart
    try {
      const cartOrderExtraChargeService = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)

      const extraCharges = await cartOrderExtraChargeService.listCartOrderExtraCharges({
        cart_id: cartId,
        status: 1 // Only active charges
      })

      // Calculate extra charge total
      const rawExtraChargeTotal = extraCharges.reduce((total: number, charge: any) => total + charge.fee_amount, 0)
      const extraChargeTotal = roundToTwoDecimals(rawExtraChargeTotal)

      // Add extra charges to order response - round individual amounts
      order.extra_charges = extraCharges.map((charge: any) => ({
        id: charge.id,
        name: charge.name,
        amount: roundToTwoDecimals(charge.fee_amount),
        description: charge.description,
        metadata: charge.metadata
      }))

      // Update order totals to include extra charges - ROUND THE TOTAL
      order.extra_charge_total = extraChargeTotal
      // order.total = (order.subtotal || 0) + (order.shipping_total || 0) + (order.tax_total || 0) + extraChargeTotal - (order.discount_total || 0)
      order.total = roundToTwoDecimals((order.total || 0) + extraChargeTotal)

    } catch (error) {
      // If extra charge module is not available, continue without it
      console.warn('Extra charge module not available for order details:', error)
      order.extra_charges = []
      order.extra_charge_total = 0
    }

    return new StepResponse(order)
  }
)
