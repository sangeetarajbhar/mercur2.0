import {
  IPromotionModuleService,
  UsageComputedActions,
  CampaignBudgetUsageContext
} from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

export interface RegisterUsageStepInput {
  usageActions: UsageComputedActions[]
  context?: CampaignBudgetUsageContext
}

export const registerUsageStepId = 'register-promo-usage'
export const registerUsageStep = createStep(
  registerUsageStepId,
  async (input: RegisterUsageStepInput, { container }) => {
    const { usageActions, context } = input
    
    if (!usageActions.length) {
      return new StepResponse(null, [])
    }

    const promotionModule = container.resolve<IPromotionModuleService>(
      Modules.PROMOTION
    )

    // Pass customer context to Medusa for per-customer budget tracking
    // If context is provided, Medusa will create/update records in promotion_campaign_budget_usage table
    // This is critical for usage_per and spend_per budget types to track per-customer limits
    const usageContext: CampaignBudgetUsageContext = context || {
      customer_id: null,
      customer_email: null
    }
    
    // Always pass context, even if customer_id is null (for global budgets, Medusa will ignore it)
    // For per-customer budgets (usage_per/spend_per), Medusa will create/update records
    // in promotion_campaign_budget_usage table with attribute_value = customer_id
    await promotionModule.registerUsage(usageActions, usageContext)

    return new StepResponse(null, usageActions)
  },
  async (revertData: UsageComputedActions[], { container }) => {
    if (!revertData?.length) {
      return
    }

    const promotionModule = container.resolve<IPromotionModuleService>(
      Modules.PROMOTION
    )

    // Revert usage - Medusa will handle per-customer budget usage reversion
    await promotionModule.revertUsage(revertData, {} as any)
  }
)

