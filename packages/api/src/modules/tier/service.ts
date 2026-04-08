import { MedusaService } from "@medusajs/framework/utils"
import { Tier } from "./models/tier"
import { TierRule } from "./models/tier-rule"

class TierModuleService extends MedusaService({
  Tier,
  TierRule,
}) {
  async calculateNextTierUpgrade(
    currencyCode: string,
    totalPurchaseValue: number
  ): Promise<{ id: string; name: string; promo_id: string | null } | null> {
    const [nextRule] = await this.listTierRules(
      {
        currency_code: currencyCode,
        min_purchase_value: { $gt: totalPurchaseValue },
      },
      {
        order: { min_purchase_value: "ASC" },
        take: 1,
      }
    )

    if (!nextRule?.tier_id) {
      return null
    }

    const [tier] = await this.listTiers({ id: nextRule.tier_id })
    return tier ?? null
  }
}

export default TierModuleService

