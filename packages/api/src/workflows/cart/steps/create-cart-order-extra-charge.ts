import { MedusaError } from "@medusajs/framework/utils";
import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk";
import { CreateCartOrderExtraChargeDTO } from '../../../modules/cart-order-extra-charge/types/mutations'
import CartOrderExtraChargeModuleService from '../../../modules/cart-order-extra-charge/service'
import { CART_ORDER_EXTRA_CHARGE_MODULE } from '../../../modules/cart-order-extra-charge'

export const createCartOrderExtraChargeStep = createStep(
  'create-cart-order-extra-charge-step',
  async (data: CreateCartOrderExtraChargeDTO, { container }) => {
    const service = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)
    const cartOrderExtraCharge = await service.createCartOrderExtraCharges(data)

    return new StepResponse(cartOrderExtraCharge, cartOrderExtraCharge.id)
  },
  async (cartOrderExtraChargeId: string, { container }) => {
    if (!cartOrderExtraChargeId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Cart order extra charge ID is required for compensation'
      )
    }

    const service = container.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)
    await service.softDeleteCartOrderExtraCharges(cartOrderExtraChargeId)
  }
)
