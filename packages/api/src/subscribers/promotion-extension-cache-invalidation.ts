import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { invalidatePromotionCacheById, getPromotionRulesWithCache, invalidateActivePromotionsEnriched } from "../shared/utils/promotion-cache"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import promotionExtensionLink from "../links/promotion-custom"

/**
 * Subscriber to invalidate and repopulate promotion cache when promotion extension is updated
 * Promotion extensions contain seller_ids, first_customer, cart_sub_total, override_existing, etc.
 */
export default async function promotionExtensionChangedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    
    // Find the promotion linked to this extension
    const {
      data: [link]
    } = await query.graph({
      entity: promotionExtensionLink.entryPoint,
      fields: ['promotion_id', 'promotion.code'],
      filters: {
        promotion_extension_id: data.id
      }
    })
    
    if (!link || !link.promotion) {
      console.log(`No promotion found for extension ID ${data.id}`)
      return
    }
    
    const promotionId = link.promotion_id
    const promotionCode = link.promotion.code
    
    if (!promotionCode) {
      console.log(`No promotion code found for extension ID ${data.id}`)
      return
    }
    
    // Invalidate cache first
    await invalidatePromotionCacheById(promotionId, container)
    await invalidateActivePromotionsEnriched(container)
    
    // Repopulate cache with updated data
    // This ensures the cache is immediately updated with the new override_existing value
    await getPromotionRulesWithCache(promotionCode, container)
    
  } catch (error) {
    console.error(` Error updating promotion cache for extension ID ${data.id}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: [
    "promotion_extension.created",
    "promotion_extension.updated",
    "promotion_extension.deleted"
  ],
  context: {
    subscriberId: 'promotion-extension-cache-invalidation-handler',
  }
}


