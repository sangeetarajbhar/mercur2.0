import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { PromotionActions, Modules } from '@medusajs/framework/utils'
import { IPromotionModuleService } from '@medusajs/framework/types'
import CustomPromotionModuleService from '../../../modules/promotion-custom/service'
import { updateCartPromotionsWorkflow } from '../workflows/update-cart-promotions'

export interface ValidateCartPromotionsStepInput {
  cart: any
}

/**
 * Step to validate all applied promotions before checkout
 * Removes any invalid promotions (e.g., minimum cart value not met)
 * Throws error if promotions were removed to prevent checkout with incorrect totals
 */
export const validateCartPromotionsStepId = 'validate-cart-promotions'
export const validateCartPromotionsStep = createStep(
  validateCartPromotionsStepId,
  async (input: ValidateCartPromotionsStepInput, { container }) => {
    const { cart } = input

    if (!cart || !cart.id) {
      return new StepResponse(null)
    }

    // Get all applied promotions
    const appliedPromotions = cart.promotions || []
    
    if (appliedPromotions.length === 0) {
      return new StepResponse(null)
    }

    // Use custom promotion service to check eligibility (reuses all existing eligibility checks)
    const baseService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)
    const promotionService = (new CustomPromotionModuleService(baseService, container) as any) as IPromotionModuleService

    const invalidPromotions: Array<{code: string, reason: string}> = []

    // Validate each applied promotion using computeActions (checks ALL eligibility rules)
    for (const promotion of appliedPromotions) {
      if (!promotion.code) {
        continue
      }

      try {
        // Prepare application context (same as in get-actions-to-compute-from-promotions)
        const customer = cart.customer || null
        const customerId = cart.customer_id || customer?.id || null
        
        // Clear adjustments temporarily so computeActions works with clean cart
        const cartForValidation = {
          ...cart,
          items: cart.items?.map((item: any) => ({
            ...item,
            adjustments: []
          })) || []
        }
        
        const applicationContext = {
          cart: cartForValidation,
          customer: customer,
          customer_id: customerId,
          region: cart.region || null,
          currency_code: (cart.currency_code || 'inr').toLowerCase()
        }
        
        // Try to compute actions - if it returns empty, promotion is invalid
        const actions = await promotionService.computeActions(
          [promotion.code],
          applicationContext
        )
        
        // If no actions returned, promotion is no longer eligible
        if (!actions || actions.length === 0) {
          invalidPromotions.push({
            code: promotion.code,
            reason: `Promotion '${promotion.code}' is no longer applicable to your cart`
          })
        }

      } catch (error) {
        console.error(`[VALIDATE PROMOTIONS] Error validating promotion ${promotion.code}:`, error)
        // If there's an error computing actions, mark as invalid
        invalidPromotions.push({
          code: promotion.code,
          reason: `Promotion '${promotion.code}' is no longer available`
        })
      }
    }

    // If there are invalid promotions, remove them and throw error
    if (invalidPromotions.length > 0) {
      // Remove each invalid promotion
      for (const invalidPromo of invalidPromotions) {
        try {
          await updateCartPromotionsWorkflow(container).run({
            input: {
              cart_id: cart.id,
              promo_codes: [invalidPromo.code],
              action: PromotionActions.REMOVE
            }
          })
        } catch (removeError) {
          console.error(`[VALIDATE PROMOTIONS] Failed to remove invalid promotion ${invalidPromo.code}:`, removeError)
          // Continue removing other promotions even if one fails
        }
      }

      // Throw error to stop checkout
      const errorMessage = invalidPromotions.length === 1
        ? `Promotion '${invalidPromotions[0].code}' has been removed from your cart as it no longer meets the requirements. Please review your cart and try again.`
        : `${invalidPromotions.length} promotions have been removed from your cart as they no longer meet the requirements. Please review your cart and try again.`

      throw new Error(errorMessage)
    }

    return new StepResponse(null)
  }
)

