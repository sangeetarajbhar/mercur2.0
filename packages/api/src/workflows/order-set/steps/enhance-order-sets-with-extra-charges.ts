import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import CartOrderExtraChargeModuleService from '../../../modules/cart-order-extra-charge/service'
import { CART_ORDER_EXTRA_CHARGE_MODULE } from '../../../modules/cart-order-extra-charge'

interface ExtraCharge {
  id: string
  name: string | null
  amount: number
  description: string | null
  metadata: Record<string, unknown> | null
}

interface OrderSet {
  id: string
  cart_id?: string | null
  orders?: unknown[] | null
  extra_charge_total?: number
  extra_charges?: ExtraCharge[]
  [key: string]: unknown
}

export const enhanceOrderSetsWithExtraChargesStep = createStep(
  'enhance-order-sets-with-extra-charges',
  async (orderSets: OrderSet[], { container }) => {
    const enhancedOrderSets: OrderSet[] = []

    for (const orderSet of orderSets) {
      if (orderSet.cart_id) {
        try {
          // Fetch extra charges for this cart directly (specialized for order formatting)
          const cartOrderExtraChargeService = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)

          const rawCharges = await cartOrderExtraChargeService.listCartOrderExtraCharges({
            cart_id: orderSet.cart_id,
            status: 1 // Only active charges
          })

          // Transform raw charges to ExtraCharge type
          const extraCharges: ExtraCharge[] = rawCharges.map((charge: {
            id: string
            name: string | null
            fee_amount: number
            description: string | null
            metadata: Record<string, unknown> | null
          }) => ({
            id: charge.id,
            name: charge.name,
            amount: Number(charge.fee_amount),
            description: charge.description,
            metadata: charge.metadata
          }))

          // Calculate extra charge total
          const extraChargeTotal = extraCharges.reduce((total, charge) => total + charge.amount, 0)

          // Add extra charges at ORDER SET level, not individual order level
          // Extra charges apply to the entire order set (e.g., delivery fee for the whole cart)
          const enhancedOrderSet: OrderSet = {
            ...orderSet,
            // Keep orders unchanged - don't add extra charges to individual orders
            orders: orderSet.orders,
            // Add extra charge information at order set level
            extra_charge_total: extraChargeTotal,
            extra_charges: extraCharges
          }

          enhancedOrderSets.push(enhancedOrderSet)
        } catch (error) {
          // If extra charges can't be fetched, use original order set with zero extra charges
          console.warn('Could not fetch extra charges for order set:', orderSet.id, error)
          enhancedOrderSets.push({
            ...orderSet,
            extra_charge_total: 0,
            extra_charges: []
          })
        }
      } else {
        // No cart_id means no extra charges
        enhancedOrderSets.push({
          ...orderSet,
          extra_charge_total: 0,
          extra_charges: []
        })
      }
    }

    return new StepResponse(enhancedOrderSets)
  }
)
