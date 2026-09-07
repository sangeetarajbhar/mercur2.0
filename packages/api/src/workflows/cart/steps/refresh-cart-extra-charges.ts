import {
  WorkflowResponse,
  createWorkflow,
  transform,
  when,
} from '@medusajs/framework/workflows-sdk'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'
import { addToCartWorkflow } from '@medusajs/medusa/core-flows'

import { evaluateExtraChargeRulesStep } from '../steps/evaluate-extra-charge-rules'
import { getCartContextStep } from '../steps/get-cart-context'
import { removeExtraChargeLineItemsStep } from '../steps/remove-extra-charge-line-items'

export const refreshCartExtraChargesWorkflowId = 'refresh-cart-extra-charges'

interface RefreshCartExtraChargesWorkflowResponse {
  cart: any
  applied_charges: any[]
  removed_items: any
}

/**
 * This workflow refreshes a cart's extra charges by:
 * 1. Removing existing extra charge line items
 * 2. Evaluating applicable extra charges based on current cart state
 * 3. Adding new extra charge line items
 * 
 * This should be called whenever cart content changes that might affect extra charge rules.
 */
export const refreshCartExtraChargesWorkflow = createWorkflow(
  refreshCartExtraChargesWorkflowId,
  function (input: { cart_id: string }) {
    // Get cart context for rule evaluation
    const cartContext = getCartContextStep(input.cart_id)
    
    // Remove existing extra charge line items from cart
    const removedItems = removeExtraChargeLineItemsStep(input.cart_id)
    
    // Evaluate applicable extra charges based on current cart state
    const applicableCharges = evaluateExtraChargeRulesStep(cartContext)
    
    // Transform applicable charges to line items
    const chargeLineItems = transform(applicableCharges, (charges) =>
      charges.map((charge) => ({
        title: charge.name,
        unit_price: charge.amount,
        quantity: 1,
        is_custom_price: true,
        metadata: { 
          extra_charge_id: charge.id, 
          is_extra_charge: true,
          applied_rules: charge.applied_rules || []
        }
      }))
    )
    
    // Add new extra charge line items to cart (only if there are charges to add)
    when({ chargeLineItems }, ({ chargeLineItems }) => {
      return chargeLineItems.length > 0
    }).then(() => {
      addToCartWorkflow.runAsStep({ 
        input: { 
          cart_id: input.cart_id, 
          items: chargeLineItems 
        } 
      })
    })
    
    // Return updated cart
    const { data: updatedCarts } = useQueryGraphStep({
      entity: 'cart',
      filters: { id: input.cart_id },
      fields: ['id', 'items.*', 'total', 'subtotal']
    }).config({ name: 'refetch-cart-after-extra-charges' })
    
    return new WorkflowResponse<RefreshCartExtraChargesWorkflowResponse>({
      cart: updatedCarts[0] as any,
      applied_charges: applicableCharges as any[],
      removed_items: removedItems as any
    })
  }
)
