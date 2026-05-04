import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { createCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  CART_EXTRA_DETAIL_MODULE,
} from "../../../modules/cart-extra-detail"
import CartExtraDetailModuleService from "../../../modules/cart-extra-detail/service"


createCartWorkflow.hooks.cartCreated(
  (async ({ cart }, { container }) => {
    const cartExtraDetailService = container.resolve<CartExtraDetailModuleService>(
      CART_EXTRA_DETAIL_MODULE
    )
    const link = container.resolve(ContainerRegistrationKeys.LINK)

    const cartExtraDetail = await cartExtraDetailService.createCartExtraDetails({
      shipping_type: "single",
    })

    const cartExtraDetailLink = {
      [Modules.CART]: {
        cart_id: cart.id,
      },
      [CART_EXTRA_DETAIL_MODULE]: {
        cart_extra_detail_id: cartExtraDetail.id,
      },
    }

    await link.create(cartExtraDetailLink)

    return new StepResponse(void 0, {
      cartExtraDetailId: cartExtraDetail.id,
      cartExtraDetailLink,
    })
  }),
  (async (compensationInput, { container }) => {
    if (!compensationInput) {
      return
    }

    const cartExtraDetailService = container.resolve<CartExtraDetailModuleService>(
      CART_EXTRA_DETAIL_MODULE
    )
    const link = container.resolve(ContainerRegistrationKeys.LINK)

    if (compensationInput.cartExtraDetailLink) {
      await link.dismiss(compensationInput.cartExtraDetailLink)
    }

    if (compensationInput.cartExtraDetailId) {
      await cartExtraDetailService.deleteCartExtraDetails(compensationInput.cartExtraDetailId)
    }
  })
)