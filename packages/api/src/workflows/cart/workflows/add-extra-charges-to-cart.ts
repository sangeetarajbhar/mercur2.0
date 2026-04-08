import {
  WorkflowResponse,
  createWorkflow,
  transform
} from '@medusajs/framework/workflows-sdk'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'
import { addToCartWorkflow } from '@medusajs/medusa/core-flows'

import { addExtraChargesToCartStep } from '../steps/add-extra-charges-to-cart'
import { getCartContextStep } from '../steps/get-cart-context'
import { evaluateExtraChargeRulesStep } from '../steps/evaluate-extra-charge-rules'

// Legacy workflow for backward compatibility
export const addExtraChargesToCartWorkflow = createWorkflow(
  'add-extra-charges-to-cart',
  function (input: { cart_id: string }) {
    // Fetch all active extra charges as line items
    const chargeLineItems = addExtraChargesToCartStep(input.cart_id)

    // Transform the charge line items if needed (e.g., add more metadata)
    const transformedChargeLineItems = transform(chargeLineItems, (items) =>
      items.map((item) => ({
        ...item,
        // Add or modify metadata if needed
      }))
    )

    // Add all charge line items together to the cart
    addToCartWorkflow.runAsStep({ input: { cart_id: input.cart_id, items: transformedChargeLineItems } })

    // Retrieve and return the updated cart
    const { data: updatedCarts } = useQueryGraphStep({
      entity: 'cart',
      filters: { id: input.cart_id },
      fields: ['id', 'items.*']
    }).config({ name: 'refetch-cart' })

    return new WorkflowResponse({ cart: updatedCarts[0] })
  }
)

// New rule-based workflow
export const addExtraChargesToCartWithRulesWorkflow = createWorkflow(
  'add-extra-charges-to-cart-with-rules',
  function (input: { cart_id: string }) {
    // Get cart context for rule evaluation
    const cartContext = getCartContextStep(input.cart_id)
    
    // Evaluate applicable extra charges based on rules
    const applicableCharges = evaluateExtraChargeRulesStep(cartContext)
    
    // Transform to line items
    const chargeLineItems = transform(applicableCharges, (charges) =>
      charges.map((charge) => ({
        title: charge.name,
        unit_price: charge.amount,
        quantity: 1,
        metadata: { 
          extra_charge_id: charge.id, 
          is_extra_charge: true,
          applied_rules: charge.applied_rules // Track which rules triggered this
        }
      }))
    )
    
    // Add to cart
    addToCartWorkflow.runAsStep({ 
      input: { 
        cart_id: input.cart_id, 
        items: chargeLineItems 
      } 
    })
    
    // Return updated cart
    const { data: updatedCarts } = useQueryGraphStep({
      entity: 'cart',
      filters: { id: input.cart_id },
      fields: ['id', 'items.*']
    }).config({ name: 'refetch-cart' })
    
    return new WorkflowResponse({ cart: updatedCarts[0] })
  }
)
