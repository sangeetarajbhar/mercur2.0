import { PromotionActions } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { getPromotionRulesWithCache } from "../../../shared/utils/promotion-cache"

export interface CheckPromotionActionStepInput {
  promo_codes: string[]
}

export const checkPromotionActionStepId = "check-promotion-action"

/**
 * Check if any promotion code has override_existing flag set to true
 * Returns REPLACE action if any promotion has override_existing = true, otherwise ADD
 */
export const checkPromotionActionStep = createStep(
  checkPromotionActionStepId,
  async (input: CheckPromotionActionStepInput, { container }) => {
    const { promo_codes } = input
    
    if (!promo_codes || promo_codes.length === 0) {
      return new StepResponse(PromotionActions.ADD)
    }

    // Check if any promotion has override_existing = true
    for (const code of promo_codes) {
      const promotionRules = await getPromotionRulesWithCache(code, container)
      if (promotionRules?.override_existing === true) {
        return new StepResponse(PromotionActions.REPLACE)
      }
    }

    return new StepResponse(PromotionActions.ADD)
  }
)
