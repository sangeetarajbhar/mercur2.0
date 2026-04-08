import { StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, PromotionActions } from '@medusajs/framework/utils'
import { refreshCartItemsWorkflow } from '../workflows/refresh-cart-items'
import { updateCartPromotionsWorkflow } from '../workflows/update-cart-promotions'
import { getPromotionRulesWithCache, getActivePromotionsEnriched } from '../../../shared/utils/promotion-cache'

/**
 * Hook that automatically discovers and applies eligible automatic promotions
 * when cart is refreshed (item added, quantity changed, cart viewed, etc.)
 * 
 * Rules:
 * - Manual > Auto (skips auto if manual exists)
 * - Best selection (if multiple auto promos)
 * - Eligibility validation (via CustomPromotionModuleService)
 * - Optional: rejected codes tracking (prevents re-application)
 */
refreshCartItemsWorkflow.hooks.beforeRefreshingPaymentCollection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ input }, context: { container?: any }) => {
    const cartId = input.cart_id
    
    // Access container from context
    const container = context?.container
    if (!container) {
      console.error('Container not available in auto-promotion-discovery hook')
      return new StepResponse(void 0)
    }
    
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)

      // STEP 1: Get existing cart promotions
      const { data: [cart] } = await query.graph({
        entity: 'cart',
        fields: ['id', 'promotions.*', 'subtotal', 'metadata'],
        filters: { id: cartId }
      })

      if (!cart) {
        return new StepResponse(void 0)
      }

      // STEP 2: Check if manual promotions exist (skip auto if manual exists)
      const existingPromotions = (cart.promotions || []) as Array<{ code?: string; is_automatic?: boolean }>
      const manualPromotions = existingPromotions.filter((p) => !p.is_automatic)
      
      if (manualPromotions.length > 0) {
        // Manual promotions exist - skip automatic discovery
        return new StepResponse(void 0)
      }

      // STEP 3: Find all active automatic promotions (from cache)
      const allActivePromotions = await getActivePromotionsEnriched(container)
      const autoPromotions = (allActivePromotions || []).filter(
        (p: any) => p && p.is_automatic
      )

      if (autoPromotions.length === 0) {
        return new StepResponse(void 0)
      }

      // STEP 4: Filter out already applied promotions
      const existingCodes = existingPromotions.map((p) => p.code).filter(Boolean) as string[]
      const newAutoCodes = (autoPromotions as Array<{ code: string }>)
        .map((p) => p.code)
        .filter((code: string) => !existingCodes.includes(code))

      if (newAutoCodes.length === 0) {
        return new StepResponse(void 0)
      }

      // STEP 5: Get rejected codes from metadata (optional)
      let rejectedCodes: string[] = []
      if (cart.metadata) {
        let metadata = cart.metadata
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata)
          } catch {
            metadata = {}
          }
        }
        rejectedCodes = metadata.rejected_auto_promo_codes || []
      }

      const eligibleCodes = newAutoCodes.filter(
        (code: string) => !rejectedCodes.includes(code)
      )

      if (eligibleCodes.length === 0) {
        return new StepResponse(void 0)
      }

      // STEP 6: Select BEST promotion (if multiple)
      let bestCode: string | null = null
      
      if (eligibleCodes.length === 1) {
        bestCode = eligibleCodes[0]
      } else {
        // Calculate discount value for each and select best
        const promotionValues: Array<{ code: string; discountValue: number }> = []
        
        for (const code of eligibleCodes) {
          try {
            const rules = await getPromotionRulesWithCache(code, container)
            // Basic check: cart subtotal meets minimum
            if (rules?.cart_sub_total && cart.subtotal >= rules.cart_sub_total) {
              // Estimate discount value (simplified - actual value computed by computeActions)
              const discountValue = rules.promo_code_upper_limit || 0
              promotionValues.push({ code, discountValue })
            }
          } catch (error) {
            console.error(`Error evaluating promotion ${code}:`, error)
          }
        }

        // Sort by discount value (highest first) and select top 1
        if (promotionValues.length > 0) {
          promotionValues.sort((a, b) => b.discountValue - a.discountValue)
          bestCode = promotionValues[0].code
        }
      }

      // STEP 7: Apply best promotion using Medusa Core workflow
      if (bestCode) {
        await updateCartPromotionsWorkflow(container).run({
          input: {
            cart_id: cartId,
            promo_codes: [bestCode],
            action: PromotionActions.ADD
          }
        })
        // Medusa Core's computeActions will validate eligibility:
        // - cart_sub_total ✅
        // - first_customer ✅
        // - seller_ids ✅
        // - product_rule_ids ✅
        // If not eligible, no adjustments created (silent fail)
      }
    } catch (error) {
      // Don't break cart refresh if auto promo discovery fails
      console.error('Error in automatic promotion discovery:', error)
    }

    return new StepResponse(void 0)
  }
)

