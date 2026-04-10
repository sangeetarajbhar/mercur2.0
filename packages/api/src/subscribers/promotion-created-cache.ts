import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { getPromotionRulesWithCache, invalidateActivePromotionsEnriched } from '../shared/utils/promotion-cache'
import { Modules } from '@medusajs/framework/utils'

/**
 * Subscriber to pre-populate cache when a promotion is created
 */
export default async function promotionCreatedCacheHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const promotionId = event.data.id
  
  try {
    const promotionService = container.resolve(Modules.PROMOTION)
    
    // Get promotion code
    const promotions = await promotionService.listPromotions(
      { id: [promotionId] },
      { select: ["code"] }
    )
    
    if (promotions && promotions.length > 0 && promotions[0].code) {
      const promotionCode = promotions[0].code
      
      // Pre-populate cache for newly created promotion
      await getPromotionRulesWithCache(promotionCode, container)
      // Invalidate enriched list so new promotion appears
      await invalidateActivePromotionsEnriched(container)
    }
  } catch (error) {
    console.error(`Error pre-populating promotion cache for ${promotionId}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: 'promotion.created'
}


