import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getPromotionRulesWithCache, getActivePromotionsEnriched } from "../../../shared/utils/promotion-cache"

export interface CleanupAutoPromotionsStepInput {
  cart_id: string
}

export const cleanupAutoPromotionsStepId = "cleanup-auto-promotions"

/**
 * Cleanup automatic promotion adjustments when manual promotions exist
 * Only removes automatic promotions with override_existing = true
 * This ensures manual promotions take precedence over override automatic ones
 * 
 * This step should be called after promotion updates to ensure data consistency
 */
export const cleanupAutoPromotionsStep = createStep(
  cleanupAutoPromotionsStepId,
  async (input: CleanupAutoPromotionsStepInput, { container }) => {
    const { cart_id } = input
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Get all cart promotions for this cart
    const cartPromotions = await knex('cart_promotion')
      .select(['id', 'promotion_id'])
      .where('cart_id', cart_id)
      .whereNull('deleted_at')

    if (!cartPromotions || cartPromotions.length === 0) {
      return new StepResponse({ wasCleanedUp: false })
    }

    const promotionIds = cartPromotions.map(cp => cp.promotion_id).filter(Boolean)
    
    if (promotionIds.length === 0) {
      return new StepResponse({ wasCleanedUp: false })
    }

    // Check if any of these promotions are manual (not automatic)
    const allActivePromotions = await getActivePromotionsEnriched(container)
    const promotionIdSet = new Set(promotionIds)
    const promotions = (allActivePromotions || []).filter(
      (p: any) => p && p.id && promotionIdSet.has(p.id)
    )

    // Separate manual and automatic promotions in the cart
    const manualPromotions = promotions.filter(p => !p.is_automatic)
    const autoPromotions = promotions.filter(p => p.is_automatic)

    // Only cleanup if BOTH manual and automatic promotions exist in cart
    if (!manualPromotions || manualPromotions.length === 0 || !autoPromotions || autoPromotions.length === 0) {
      return new StepResponse({ wasCleanedUp: false })
    }

    // Filter automatic promotions to only those with override_existing = true
    const autoPromotionsToRemove: Array<{ id: string; code?: string }> = []
    for (const autoPromo of autoPromotions) {
      if (autoPromo.code) {
        const autoPromoRules = await getPromotionRulesWithCache(autoPromo.code, container)
        // Only remove if override_existing = true (default is true, so undefined/null also means true)
        if (autoPromoRules?.override_existing !== false) {
          autoPromotionsToRemove.push(autoPromo)
        }
      }
    }

    if (autoPromotionsToRemove.length === 0) {
      return new StepResponse({ wasCleanedUp: false })
    }

    // Get automatic promotion IDs that should be removed (only those with override_existing = true)
    const autoPromotionIds = autoPromotionsToRemove.map(p => p.id).filter(Boolean)

    if (autoPromotionIds.length === 0) {
      return new StepResponse({ wasCleanedUp: false })
    }

    // Get line items for this cart using direct knex query
    // (query.graph doesn't support "cart_line_item" entity directly)
    const lineItems = await knex('cart_line_item')
      .select(['id'])
      .where('cart_id', cart_id)
      .whereNull('deleted_at')

    if (!lineItems || lineItems.length === 0) {
      return new StepResponse({ wasCleanedUp: false })
    }
    
    const lineItemIds = lineItems.map(li => li.id)

    // Find automatic promotion adjustments for promotions with override_existing = true
    const autoAdjustments = await knex('cart_line_item_adjustment')
      .select(['id', 'promotion_id', 'code', 'amount'])
      .whereIn('item_id', lineItemIds)
      .whereIn('promotion_id', autoPromotionIds)
      .whereNull('deleted_at')

    if (!autoAdjustments || autoAdjustments.length === 0) {
      return new StepResponse({ wasCleanedUp: false })
    }

    // Soft-delete automatic promotion adjustments
    const adjustmentIds = autoAdjustments.map(adj => adj.id)
    await knex('cart_line_item_adjustment')
      .whereIn('id', adjustmentIds)
      .update({ deleted_at: new Date() })

    // Also soft-delete from cart_promotion table
    const autoPromotionIdsToDelete = [...new Set(autoAdjustments.map(adj => adj.promotion_id).filter(Boolean))]
    await knex('cart_promotion')
      .where('cart_id', cart_id)
      .whereIn('promotion_id', autoPromotionIdsToDelete as string[])
      .update({ deleted_at: new Date() })

    // Update cart timestamp to ensure totals are recomputed
    await knex('cart')
      .where('id', cart_id)
      .update({ updated_at: new Date() })

    return new StepResponse({ wasCleanedUp: true })
  }
)

