import { ICartModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { getCustomPromotionService } from "../../../shared/utils/get-custom-promotion-service"

/**
 * The details for cleaning up orphaned line item adjustments.
 */
export interface CleanupLineItemAdjustmentsCartStepInput {
  /**
   * The ID of the cart to clean up adjustments for.
   */
  cart_id: string
  /**
   * Optional promotion codes that are being applied (incoming).
   * Used to determine if manual promotions are present.
   */
  incoming_promo_codes?: string[]
}

type RollbackData = {
  adjustmentIds: string[]
  automaticPromotionIds: string[]
}

export const cleanupLineItemAdjustmentsStepId = "cleanup-line-item-adjustments"

/**
 * Cleanup orphaned adjustments step
 * Removes adjustments that don't have corresponding active promotions in cart_promotion table
 * 
 * @example
 * cleanupOrphanedAdjustmentsStep({
 *   cart_id: "cart_123"
 * })
 */
export const cleanupOrphanedAdjustmentsStep = createStep(
  cleanupLineItemAdjustmentsStepId,
  async (data: CleanupLineItemAdjustmentsCartStepInput, { container }): Promise<StepResponse<void, RollbackData>> => {
    const { cart_id } = data
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const promotionService = getCustomPromotionService(container)
    const cartModuleService: ICartModuleService = container.resolve(Modules.CART)
    
    // Track all adjustment IDs that will be deleted for rollback
    const allDeletedAdjustmentIds: string[] = []

    // Step 1: Get all promotions for this cart
    const cartPromotions = await knex("cart_promotion")
      .select(["promotion_id"])
      .where("cart_id", cart_id)
      .whereNull("deleted_at")

    const cartPromotionIds = cartPromotions.map((cp: any) => cp.promotion_id)

    // Step 1.1: Get promotion details - keep all active promotions
    const activePromotionIds: string[] = []
    
    if (cartPromotionIds.length > 0) {
      const promotions = await (promotionService as any).listActivePromotions(
        { id: cartPromotionIds },
        { select: ["id", "code", "status"] }
      )

      // Keep all active promotions and inactive promotions (Medusa core behavior)
      promotions.forEach((p: any) => {
        if (p.status === "active" || p.status === "inactive") {
          activePromotionIds.push(p.id)
        }
      })
    }

    // Use active promotion IDs for cleanup logic
    const activePromotionIds_final = activePromotionIds

    // Step 2: Get all line items for this cart
    const cartLineItems = await knex("cart_line_item")
      .select(["id"])
      .where("cart_id", cart_id)
      .whereNull("deleted_at")

    const lineItemIds = cartLineItems.map((li: any) => li.id)

    // CRITICAL: If cart has no active line items, clean up ALL adjustments for this cart
    // This includes adjustments for soft-deleted line items that weren't cleaned up
    if (lineItemIds.length === 0) {
      // Get ALL line items for this cart (including soft-deleted ones)
      const allLineItems = await knex("cart_line_item")
        .select(["id"])
        .where("cart_id", cart_id)
      
      const allLineItemIds = allLineItems.map((li: any) => li.id)
      
      if (allLineItemIds.length > 0) {
        // Find all adjustments for these line items (including soft-deleted line items)
        const orphanedAdjustments = await knex("cart_line_item_adjustment")
          .select(["id", "item_id", "promotion_id", "code", "amount"])
          .whereIn("item_id", allLineItemIds)
          .whereNull("deleted_at")
        
        if (orphanedAdjustments.length > 0) {
          const adjustmentIds = orphanedAdjustments.map((adj: any) => adj.id)
          await cartModuleService.softDeleteLineItemAdjustments(adjustmentIds)
          
          // Also remove all promotions from cart_promotion table
          await knex("cart_promotion")
            .where("cart_id", cart_id)
            .update({ deleted_at: new Date() })
          
          // Update cart timestamp
          await knex("cart")
            .where("id", cart_id)
            .update({ updated_at: new Date() })
        }
      }
      
      return new StepResponse(void 0, { adjustmentIds: [], automaticPromotionIds: [] })
    }

    // Step 3: Find orphaned adjustments
    // Orphaned = adjustments that don't have a corresponding active promotion
    let orphanedAdjustments: any[] = []

    if (activePromotionIds_final.length === 0) {
      // No active promotions, so ALL adjustments are orphaned
      orphanedAdjustments = await knex("cart_line_item_adjustment")
        .select(["id", "item_id", "promotion_id", "code", "amount"])
        .whereIn("item_id", lineItemIds)
        .whereNull("deleted_at")
    } else {
      // Find adjustments whose promotion_id is NOT in active promotions
      orphanedAdjustments = await knex("cart_line_item_adjustment")
        .select(["id", "item_id", "promotion_id", "code", "amount"])
        .whereIn("item_id", lineItemIds)
        .whereNotIn("promotion_id", activePromotionIds_final)
        .whereNull("deleted_at")
    }

    if (orphanedAdjustments.length > 0) {
      // Step 4: Soft delete orphaned adjustments using service method
      const adjustmentIds = orphanedAdjustments.map((adj: any) => adj.id)
      
      await cartModuleService.softDeleteLineItemAdjustments(adjustmentIds)
      allDeletedAdjustmentIds.push(...adjustmentIds)

      // Step 5: Update cart updated_at to trigger recalculation
      await knex("cart")
        .where("id", cart_id)
        .update({ updated_at: new Date() })
    }

    // Return all deleted adjustment IDs for potential rollback
    const rollbackData: RollbackData = { 
      adjustmentIds: [...new Set(allDeletedAdjustmentIds)], // Remove duplicates
      automaticPromotionIds: []
    }
    return new StepResponse(void 0, rollbackData)
  },
  async (rollbackData: RollbackData | undefined, { container }) => {
    if (!rollbackData) {
      return
    }

    const { adjustmentIds: adjustmentIdsToRestore } = rollbackData

    if (!adjustmentIdsToRestore?.length) {
      return
    }

    const cartModuleService: ICartModuleService = container.resolve(Modules.CART)
    await cartModuleService.restoreLineItemAdjustments(adjustmentIdsToRestore)
  }
)

