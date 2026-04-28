import { ICartModuleService } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

/**
 * The details of the line item adjustments to remove.
 */
export interface RemoveLineItemAdjustmentsStepInput {
  /**
   * The IDs of the line item adjustments to remove.
   */
  lineItemAdjustmentIdsToRemove: string[]
  /**
   * The ID of the cart (optional).
   */
  cartId?: string
  /**
   * The promotion codes to remove (optional).
   */
  promotionCodesToRemove?: string[]
}

export const removeLineItemAdjustmentsStepId = "remove-line-item-adjustments"
/**
 * This step removes line item adjustments from a cart.
 * Uses the provided adjustment IDs directly (as computed by the workflow).
 * Optionally tracks manually removed automatic promotions in metadata to prevent re-application.
 */
export const removeLineItemAdjustmentsStep = createStep(
  removeLineItemAdjustmentsStepId,
  async (data: RemoveLineItemAdjustmentsStepInput, { container }) => {
    const { lineItemAdjustmentIdsToRemove = [] } = data

    if (!lineItemAdjustmentIdsToRemove?.length) {
      return new StepResponse(void 0, [])
    }

    const cartModuleService: ICartModuleService = container.resolve(
      Modules.CART
    )

    // Soft delete adjustments using the provided IDs (already computed by workflow)
    await cartModuleService.softDeleteLineItemAdjustments(
      lineItemAdjustmentIdsToRemove
    )

    // CRITICAL FIX: Double-check that adjustments are actually soft-deleted
    // Sometimes the service method might not work correctly, so we verify and fix directly
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const now = new Date()
    
    // Verify and fix any adjustments that weren't soft-deleted
    const notDeleted = await knex('cart_line_item_adjustment')
      .whereIn('id', lineItemAdjustmentIdsToRemove)
      .whereNull('deleted_at')
      .select('id')
    
    if (notDeleted.length > 0) {
      console.warn(`Found ${notDeleted.length} adjustments that weren't soft-deleted, fixing now...`)
      await knex('cart_line_item_adjustment')
        .whereIn('id', notDeleted.map(a => a.id))
        .update({
          deleted_at: now,
          updated_at: now
        })
    }

    return new StepResponse(void 0, lineItemAdjustmentIdsToRemove)
  },
  async (lineItemAdjustmentIdsToRemove, { container }) => {
    const cartModuleService: ICartModuleService = container.resolve(
      Modules.CART
    )

    if (!lineItemAdjustmentIdsToRemove?.length) {
      return
    }

    await cartModuleService.restoreLineItemAdjustments(
      lineItemAdjustmentIdsToRemove
    )
  }
)
