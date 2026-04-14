import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

export type ValidateCartTierPromotionsStepInput = {
  cart: {
    id: string
    customer?: {
      id?: string
      tier?: {
        id?: string
        name?: string
        promo_id?: string | null
      } | null
    } | null
    promotions?: Array<{
      id?: string
      code?: string
    }>
  }
}

export const validateCartTierPromotionsStep = createStep(
  "validate-cart-tier-promotions",
  async (input: ValidateCartTierPromotionsStepInput, { container }) => {
    const { cart } = input

    if (!cart?.customer?.id || !cart?.promotions || cart.promotions.length === 0) {
      return new StepResponse(null)
    }

    const customerTier = cart.customer.tier
    if (!customerTier?.id) {
      return new StepResponse(null)
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const promotionIds = cart.promotions.map((p: any) => p.id).filter(Boolean)
    if (promotionIds.length === 0) return new StepResponse(null)

    const { data: tierPromotions } = await query.graph({
      entity: "tier",
      fields: ["id", "promo_id", "name"],
      filters: { promo_id: promotionIds },
    })

    for (const promotion of cart.promotions) {
      if (!promotion.id) continue
      const tierPromo = tierPromotions.find((tp: any) => tp.promo_id === promotion.id)
      if (tierPromo && tierPromo.id !== customerTier.id) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Cart contains promotion ${promotion.code || promotion.id} from ${tierPromo.name} tier, but you are in ${customerTier.name || "a different"} tier. Please remove this promotion to complete checkout.`
        )
      }
    }

    return new StepResponse(null)
  }
)

