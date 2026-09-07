import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import {
  invalidateActivePromotionsEnriched,
  invalidatePromotionCacheById,
} from "../../../../../shared/utils/promotion-cache"

/**
 * @oas [post] /admin/promotions/{id}/invalidate-cache
 * operationId: "AdminInvalidatePromotionCache"
 * summary: "Invalidate Promotion Cache"
 * description: "Invalidates the Redis cache for a specific promotion"
 * x-authenticated: true
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    const promotionId = req.params.id

    // Invalidate per-promotion rules cache (promotion_rules:<code>)
    await invalidatePromotionCacheById(promotionId, req.scope)

    // Invalidate promotions listing cache (active_promotions_enriched)
    await invalidateActivePromotionsEnriched(req.scope)

    res.json({
      success: true,
      message: `Cache invalidated for promotion ${promotionId}`
    })
  } catch (error) {
    console.error("Error invalidating promotion cache:", error)
    res.status(500).json({
      success: false,
      message: "Failed to invalidate cache"
    })
  }
}


