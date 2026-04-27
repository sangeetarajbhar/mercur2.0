import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

/**
 * Step to remove/soft-delete cart_promotion entries for specified promotion codes
 * This is needed when promotions are overridden (e.g., different campaigns)
 */
export const removeCartPromotionsStep = createStep(
  'remove-cart-promotions',
  async (input: { cart_id: string; promotion_codes_to_remove: string[] }, { container }) => {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    
    if (!input.promotion_codes_to_remove || input.promotion_codes_to_remove.length === 0) {
      return new StepResponse([])
    }
    
    const promotionsToRemove = await knex('promotion')
      .select(['id', 'code'])
      .whereIn('code', input.promotion_codes_to_remove)
      .whereNull('deleted_at')
    
    if (promotionsToRemove.length === 0) {
      return new StepResponse([])
    }
    
    const promotionIdsToRemove = promotionsToRemove.map((p: any) => p.id)
    
    // Soft delete cart_promotion entries
    const deletedEntries = await knex('cart_promotion')
      .where('cart_id', input.cart_id)
      .whereIn('promotion_id', promotionIdsToRemove)
      .whereNull('deleted_at')
      .update({
        deleted_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')
    return new StepResponse(deletedEntries)
  }
)

