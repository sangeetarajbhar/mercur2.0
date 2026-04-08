import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { TIER_MODULE } from "../../../modules/tier"
import TierModuleService from "../../../modules/tier/service"

export type CreateTierRulesStepInput = {
  tier_id: string
  tier_rules: Array<{
    min_purchase_value: number
    currency_code: string
  }>
}

export const createTierRulesStep = createStep(
  "create-tier-rules",
  async (input: CreateTierRulesStepInput, { container }) => {
    const tierModuleService = container.resolve<TierModuleService>(TIER_MODULE)

    const tierRules = await tierModuleService.createTierRules(
      input.tier_rules.map((rule) => ({
        tier_id: input.tier_id,
        min_purchase_value: rule.min_purchase_value,
        currency_code: rule.currency_code,
      }))
    )

    return new StepResponse(tierRules, tierRules)
  },
  async (tierRules: Array<{ id: string }>, { container }) => {
    if (!tierRules || tierRules.length === 0) {
      return
    }

    const tierModuleService = container.resolve<TierModuleService>(TIER_MODULE)
    await tierModuleService.deleteTierRules(
      tierRules.map((rule) => rule.id)
    )
  }
)

