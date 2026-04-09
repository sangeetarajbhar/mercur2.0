import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { invalidatePromotionCacheById, invalidateActivePromotionsEnriched } from "../shared/utils/promotion-cache"

/**
 * Subscriber to invalidate promotion cache when a promotion is updated or deleted
 */
export default async function promotionCacheInvalidationHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const { data } = event
    
    // Invalidate cache for this promotion
    await invalidatePromotionCacheById(data.id, container)
    await invalidateActivePromotionsEnriched(container)
  } catch (error) {
    console.error(` Error invalidating promotion cache:`, error)
  }
}

export const config: SubscriberConfig = {
  event: [
    "promotion.updated",
    "promotion.deleted"
  ],
  context: {
    subscriberId: 'promotion-cache-invalidation-handler',
  }
}


