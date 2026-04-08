import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import CartOrderExtraChargeModuleService from '../../../modules/cart-order-extra-charge/service'
import { CART_ORDER_EXTRA_CHARGE_MODULE } from '../../../modules/cart-order-extra-charge'
import { roundToTwoDecimals } from '../../../shared/utils/calculate-discount-amount'

export const refetchCartWithExtraChargesStep = createStep(
  'refetch-cart-with-extra-charges-step',
  async (input: {
    cartId: string
    scope?: MedusaContainer | null
    fields: string[]
  }, { container }) => {
    const { cartId, fields } = input
    // Ensure fields is an array before spreading
    const fieldsArray = Array.isArray(fields) ? fields : []
    const custom_fields = fieldsArray

    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const queryObject = remoteQueryObjectFromString({
      entryPoint: "cart",
      variables: { filters: { id: cartId } },
      fields: custom_fields,
    })

    const [cart] = await remoteQuery(queryObject)

    // Check if cart exists
    if (!cart) {
      console.warn(`Cart with id ${cartId} not found`)
      return new StepResponse(null)
    }

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

      // Add extra charges to cart response - round individual amounts
      cart.extra_charges = extraCharges.map((charge: any) => ({
        id: charge.id,
        name: charge.name,
        amount: roundToTwoDecimals(charge.fee_amount),
        description: charge.description,
        metadata: charge.metadata
      }))

      // Update cart totals to include extra charges - ROUND THE TOTAL
      cart.extra_charge_total = extraChargeTotal
      // cart.total = (cart.subtotal || 0) + (cart.shipping_total || 0) + (cart.tax_total || 0) + extraChargeTotal - (cart.discount_total || 0)
      cart.total = roundToTwoDecimals((cart.total || 0) + extraChargeTotal)

    } catch (error) {
      // If extra charge module is not available, continue without it
      console.warn('Extra charge module not available:', error)
      cart.extra_charges = []
      cart.extra_charge_total = 0
    }

    return new StepResponse(cart)
  }
)
