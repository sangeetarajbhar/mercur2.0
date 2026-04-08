import {
  WorkflowResponse,
  createWorkflow,
  transform,
  parallelize
} from '@medusajs/framework/workflows-sdk'
import { addToCartWorkflow } from '@medusajs/medusa/core-flows'
import { CartWorkflowEvents } from '@medusajs/framework/utils'
import { emitEventStep } from '@medusajs/medusa/core-flows'
import { refreshCartExtraChargesWorkflow } from './refresh-cart-extra-charges'

export const addToCartWithExtraChargesWorkflowId = 'add-to-cart-with-extra-charges'

/**
 * Enhanced add-to-cart workflow that automatically applies extra charges
 * after items are added to the cart. This ensures extra charges are always
 * evaluated based on the current cart state.
 */
export const addToCartWithExtraChargesWorkflow = createWorkflow(
  addToCartWithExtraChargesWorkflowId,
  function (input: { cart_id: string; items: any[] }) {
    // Run the standard add-to-cart workflow first
    const addToCartResult = addToCartWorkflow.runAsStep({
      input
    })
    
    // After items are added, refresh extra charges
    const extraChargesResult = refreshCartExtraChargesWorkflow.runAsStep({
      input: { cart_id: input.cart_id }
    })
    
    // Emit event that cart was updated with extra charges
    emitEventStep({
      eventName: CartWorkflowEvents.UPDATED,
      data: { 
        id: input.cart_id,
        extra_charges_applied: true
      }
    })
    
    return new WorkflowResponse({
      cart: extraChargesResult.cart,
      applied_charges: extraChargesResult.applied_charges,
      removed_items: extraChargesResult.removed_items
    })
  }
)

/**
 * Enhanced workflow for updating cart items with extra charges
 */
export const updateCartItemsWithExtraChargesWorkflow = createWorkflow(
  'update-cart-items-with-extra-charges',
  function (input: { cart_id: string; items: any[] }) {
    // Refresh extra charges after any cart update
    const extraChargesResult = refreshCartExtraChargesWorkflow.runAsStep({
      input: { cart_id: input.cart_id }
    })
    
    return new WorkflowResponse({
      cart: extraChargesResult.cart,
      applied_charges: extraChargesResult.applied_charges
    })
  }
)
