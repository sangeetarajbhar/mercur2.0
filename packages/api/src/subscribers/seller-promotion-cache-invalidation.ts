import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { invalidatePromotionCacheById } from "../shared/utils/promotion-cache"
import promotionSellerLink from "@mercurjs/core/links/promotion-seller-link"

/**
 * Subscriber to invalidate promotion cache when seller-promotion links are created or deleted
 * This handles seller restrictions for promotions
 */
export default async function sellerPromotionLinkChangedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {

    // The data might contain seller_id and promotion_id
    // We need to get the promotion_id to invalidate its cache
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Try to get the link details
    let promotionId: string | null = null

    // Check if we have the link ID
    if (data.id) {

      const { data: [link] } = await query.graph(
        {
          entity: promotionSellerLink.entryPoint,
          fields: ["promotion_id"],
          filters: {
            id: data.id,
          },
        },
        { throwIfKeyNotFound: true }
      )

      // const link = await knex("seller_seller_promotion_promotion")
      //   .where({ id: data.id })
      //   .first()

      if (link) {
        promotionId = link.promotion_id
      }
    }

    // If we found a promotion ID, invalidate its cache
    if (promotionId) {
      await invalidatePromotionCacheById(promotionId, container)
    } else {
      console.log(` Could not determine promotion ID from seller-promotion link`)
    }
  } catch (error) {
    console.error(`Error invalidating promotion cache for seller-promotion link:`, error)
  }
}

export const config: SubscriberConfig = {
  event: [
    "seller_seller_promotion_promotion.created",
    "seller_seller_promotion_promotion.deleted"
  ],
  context: {
    subscriberId: 'seller-promotion-link-cache-invalidation-handler',
  }
}

