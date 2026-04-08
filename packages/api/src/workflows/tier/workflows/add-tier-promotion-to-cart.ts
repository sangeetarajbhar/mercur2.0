import { PromotionActions } from "@medusajs/framework/utils"
import {
  WorkflowResponse,
  createWorkflow,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  releaseLockStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { updateCartPromotionsWorkflow } from "../../cart/workflows/update-cart-promotions"
import { validateTierPromotionStep } from "../steps/validate-tier-promotion"

export type AddTierPromotionToCartWorkflowInput = {
  cart_id: string
}

export const addTierPromotionToCartWorkflow = createWorkflow(
  "add-tier-promotion-to-cart",
  (input: AddTierPromotionToCartWorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: [
        "id",
        "customer.id",
        "customer.has_account",
        "customer.tier.*",
        "customer.tier.promotion.id",
        "customer.tier.promotion.code",
        "customer.tier.promotion.status",
        "promotions.*",
        "promotions.code",
      ],
      filters: {
        id: input.cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    const validationResult = when({ carts }, (data) => !!data.carts[0].customer).then(
      () => {
        return validateTierPromotionStep({
          customer: {
            has_account: carts[0].customer!.has_account,
            tier: {
              promo_id: carts[0].customer!.tier!.promo_id || null,
              promotion: {
                id: carts[0].customer!.tier!.promotion!.id,
                code: carts[0].customer!.tier!.promotion!.code || null,
                status: carts[0].customer!.tier!.promotion!.status || null,
              },
            },
          },
        })
      }
    )

    when({ validationResult, carts }, (data) => {
      if (!data.validationResult?.promotion_code) {
        return false
      }

      const appliedPromotionCodes =
        data.carts[0].promotions?.map((promo: { code?: string }) => promo.code) || []

      const promotionCode = data.validationResult.promotion_code
      return (
        promotionCode !== null &&
        !appliedPromotionCodes.includes(promotionCode)
      )
    }).then(() => {
      const promoCode = validationResult?.promotion_code
      if (!promoCode) {
        return
      }
      return updateCartPromotionsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          promo_codes: [promoCode],
          action: PromotionActions.ADD,
        },
      })
    })

    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse(void 0)
  }
)

