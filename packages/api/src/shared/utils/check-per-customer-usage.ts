import { CampaignBudgetType, Modules } from '@medusajs/framework/utils'

/**
 * Standalone utility to check per-customer campaign budget usage.
 *
 * Queries the `promotion_campaign_budget_usage` table directly via the
 * Medusa base promotion service's internal services — the same data that
 * Medusa core uses when calling `computeActions`.
 *
 * Returns an error object if the customer has exceeded their usage limit,
 * otherwise returns null (no limit / within limit).
 *
 * This is a module-level export so it can be called from:
 *  - CustomPromotionModuleService (replacing the private method)
 *  - filterPromotionsByPerCustomerUsage in helpers.ts
 *  - calculateProductPromotions in calculate-product-promotions.ts
 * … without needing to expose it through the Proxy.
 *
 * @param promotionCode - The promotion code to check
 * @param customerId    - The customer ID to check usage for
 * @param container     - Medusa container / scope (used to resolve baseService)
 */
export async function checkPerCustomerCampaignUsage(
  promotionCode: string,
  customerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  container: any
): Promise<{ reason: string; message: string } | null> {
  try {
    // Resolve the raw Medusa PromotionModuleService (has internal sub-services)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseService = container.resolve(Modules.PROMOTION) as any

    // Use baseService's internal promotionService_ to get promotion with campaign + budget
    const [promotion] = await baseService.promotionService_.list(
      { code: promotionCode },
      { relations: ['campaign', 'campaign.budget'] }
    )

    if (!promotion?.campaign?.budget) {
      return null
    }

    const budget = promotion.campaign.budget

    // Only check USE_BY_ATTRIBUTE type (= usage_per / spend_per)
    if (budget.type !== CampaignBudgetType.USE_BY_ATTRIBUTE) {
      return null
    }

    const perCustomerLimit = Number(budget.limit)
    if (!perCustomerLimit) {
      return null
    }

    // Query the per-customer usage table directly
    const [usageRecord] = await baseService.campaignBudgetUsageService_.list({
      budget_id: budget.id,
      attribute_value: customerId,
    })

    const perCustomerUsed = Number(usageRecord?.used) || 0

    // CRITICAL: Compare per-customer usage against per-customer limit
    // NOT the global budget used/limit
    if (perCustomerUsed >= perCustomerLimit) {
      return {
        reason: 'customer_usage_limit_exceeded',
        message: `You have already used the promotion '${promotionCode}' the maximum number of times allowed (${perCustomerLimit} time${perCustomerLimit !== 1 ? 's' : ''}).`,
      }
    }

    return null
  } catch (error) {
    console.error(`[PerCustomerUsage] Error checking per-customer campaign usage for "${promotionCode}":`, error)
    return null // Fail open
  }
}
