import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Knex } from 'knex'

export interface UpdateLineItemCartIdInput {
  line_item_ids: string[]
  source_cart_id: string
  target_cart_id: string
}

/**
 * Step: Update Line Item Cart ID
 * Moves line items from source cart to destination cart by updating cart_id
 */
export const updateLineItemCartIdStep = createStep(
  'update-line-item-cart-id',
  async (input: UpdateLineItemCartIdInput, { container }) => {
    const { line_item_ids, target_cart_id, source_cart_id } = input
    
    if (!line_item_ids || line_item_ids.length === 0) {
      return new StepResponse({ updated: 0 })
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex

    // Update cart_id for all source cart line items
    const updatedCount = await knex('cart_line_item')
      .whereIn('id', line_item_ids)
      .whereNull('deleted_at')
      .where('cart_id', source_cart_id)
      .update({
        cart_id: target_cart_id,
        updated_at: new Date()
      })

    // Soft delete source cart after moving all items
    await knex('cart')
      .where('id', source_cart_id)
      .update({
        deleted_at: new Date(),
        updated_at: new Date()
      })

    return new StepResponse({ 
      updated: updatedCount,
      line_item_ids,
      target_cart_id
    })
  },
  async (result) => {
    console.log('Compensating line item cart_id update:', result)
  }
)

