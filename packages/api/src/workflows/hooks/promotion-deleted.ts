import { deletePromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { invalidatePromotionCacheById } from "../../shared/utils/promotion-cache"

/**
 * Workflow hook to invalidate promotion cache when a promotion is deleted
 */
try {
  if (deletePromotionsWorkflow?.hooks?.promotionsDeleted) {
    deletePromotionsWorkflow.hooks.promotionsDeleted(
      async ({ ids }, { container }) => {
        try {
          
          if (!ids || ids.length === 0) {
            return
          }
          
          // Invalidate cache for each deleted promotion
          for (const promotionId of ids) {
            try {
              await invalidatePromotionCacheById(promotionId, container)
            } catch (error) {
              console.error(`Error invalidating promotion cache after deletion for ID ${promotionId}:`, error)
            }
          }
        } catch (hookError) {
          console.error(" Error in promotionsDeleted hook:", hookError)
        }
      }
    )
  } else {
    console.log(" deletePromotionsWorkflow.hooks.promotionsDeleted not available")
  }
} catch (error) {
  console.error(" Error registering promotion deleted hook:", error)
}


