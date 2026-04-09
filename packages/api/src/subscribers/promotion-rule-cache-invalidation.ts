import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { invalidatePromotionCacheById, getPromotionRulesWithCache, invalidateActivePromotionsEnriched } from "../shared/utils/promotion-cache"

/**
 * Subscriber to invalidate and repopulate promotion cache when a promotion rule is created, updated, or deleted
 * This ensures cache is refreshed immediately when rules affecting product conditions change
 */
export default async function promotionRuleChangedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    // Get the promotion ID associated with this rule
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    
    const promotionLinks = await knex("promotion_promotion_rule")
      .where({ promotion_rule_id: data.id })
      .whereNull("deleted_at")
      .pluck("promotion_id")
    
    if (promotionLinks && promotionLinks.length > 0) {
      const promotionService = container.resolve(Modules.PROMOTION)
      
      // Invalidate and repopulate cache for all affected promotions
      for (const promotionId of promotionLinks) {
        // Invalidate cache first
        await invalidatePromotionCacheById(promotionId, container)
        await invalidateActivePromotionsEnriched(container)
        
        // Get promotion code to repopulate cache
        const promotions = await promotionService.listPromotions(
          { id: [promotionId] },
          { select: ["code"] }
        )
        
        if (promotions && promotions.length > 0 && promotions[0].code) {
          // Repopulate cache with updated data immediately
          // This ensures the cache is immediately updated with the new product_rule_ids
          await getPromotionRulesWithCache(promotions[0].code, container)
        }
      }
    } else {
      console.log(`No promotions found for rule ID: ${data.id}`)
    }
  } catch (error) {
    console.error(`Error invalidating promotion cache for rule ID ${data.id}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: [
    "promotion_rule.created",
    "promotion_rule.updated",
    "promotion_rule.deleted"
  ],
  context: {
    subscriberId: 'promotion-rule-cache-invalidation-handler',
  }
}


