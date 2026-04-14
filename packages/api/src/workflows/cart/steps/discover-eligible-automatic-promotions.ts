import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getPromotionRulesWithCache } from "../../../shared/utils/promotion-cache"

interface DiscoverEligibleAutomaticPromotionsInput {
  cart_id: string
}

export const discoverEligibleAutomaticPromotionsStep = createStep(
  "discover-eligible-automatic-promotions",
  async (input: DiscoverEligibleAutomaticPromotionsInput, { container }) => {
    const { cart_id } = input

    try {
      const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const query = container.resolve(ContainerRegistrationKeys.QUERY)

      // Get existing promotions for this cart
      const cartPromotions = await knex('cart_promotion')
        .select(['id', 'promotion_id'])
        .where('cart_id', cart_id)
        .whereNull('deleted_at')

      const promotionIds = cartPromotions.map((cp: any) => cp.promotion_id)
      const existingPromotions = promotionIds.length > 0 ? await knex('promotion')
        .select(['id', 'code', 'is_automatic'])
        .whereIn('id', promotionIds)
        .whereNull('deleted_at') : []

      const manualPromotions = existingPromotions.filter((p: any) => !p.is_automatic)

      // Only discover new automatic promotions if no manual promotions exist
      if (manualPromotions.length > 0) {
        return new StepResponse({ eligiblePromotionCodes: [] })
      }

      // Get cart with subtotal and metadata (for rejected auto promo codes)
      // Use Medusa's calculated subtotal instead of manual calculation
      const { data: [cart] } = await query.graph({
        entity: 'cart',
        fields: ['id', 'subtotal', 'metadata'],
        filters: { id: cart_id }
      })

      if (!cart) {
        return new StepResponse({ eligiblePromotionCodes: [] })
      }

      // Use Medusa's calculated subtotal (includes all item calculations, adjustments, etc.)
      const cartSubtotal = (cart as any).subtotal || 0

      // Get list of rejected auto promo codes from cart metadata
      let rejectedAutoPromoCodes: string[] = []
      if (cart?.metadata) {
        let metadata = cart.metadata
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata)
          } catch {
            metadata = {}
          }
        }
        rejectedAutoPromoCodes = (metadata as any).rejected_auto_promo_codes || []
      }

      // Find all active automatic promotions that aren't already applied
      const appliedPromotionIds = existingPromotions.map((p: any) => p.id)

      let autoPromotionQuery = knex('promotion')
        .select(['id', 'code', 'is_automatic'])
        .where('is_automatic', true)
        .where('status', 'active')
        .whereNull('deleted_at')

      if (appliedPromotionIds.length > 0) {
        autoPromotionQuery = autoPromotionQuery.whereNotIn('id', appliedPromotionIds)
      }

      const availableAutoPromotions = await autoPromotionQuery
      const eligiblePromotionCodes: string[] = []

      // Trim rejected codes for comparison
      const trimmedRejectedCodes = rejectedAutoPromoCodes.map((c: string) => c.trim())

      // Check each available automatic promotion for basic eligibility
      // Full validation (first_customer, seller_ids, product restrictions, etc.) 
      // will be handled by computeActions in get-actions-to-compute-from-promotions.ts
      for (const promotion of availableAutoPromotions) {
        // Skip if this auto promotion was manually rejected by user (with trimmed comparison)
        if (promotion.code && trimmedRejectedCodes.includes(promotion.code.trim())) {
          continue
        }

        try {
          const promotionRules = await getPromotionRulesWithCache(promotion.code, container)

          // Basic eligibility check: cart subtotal meets minimum requirement
          // Other restrictions (first_customer, seller_ids, product_rule_ids, etc.)
          // will be validated by computeActions which has full cart context
          if (promotionRules?.cart_sub_total && cartSubtotal >= promotionRules.cart_sub_total) {
            eligiblePromotionCodes.push(promotion.code)
          }
        } catch (error: any) {
          console.error(`Error checking eligibility for automatic promotion ${promotion.code}:`, error.message)
        }
      }

      return new StepResponse({ eligiblePromotionCodes })
    } catch (error) {
      console.error('Error discovering eligible automatic promotions:', error)
      return new StepResponse({ eligiblePromotionCodes: [] })
    }
  }
)

