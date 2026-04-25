import {
  WorkflowResponse,
  createWorkflow,
  when,
  transform,
} from '@medusajs/framework/workflows-sdk'

import { evaluateExtraChargeRulesStep } from '../steps/evaluate-extra-charge-rules'
import { getCartContextStep } from '../steps/get-cart-context'
import { removeCartExtraChargesStep } from '../steps/remove-cart-extra-charges'
import { storeCartExtraChargesStep } from '../steps/store-cart-extra-charges'
import { refetchCartWithExtraChargesStep } from '../steps/refetch-cart-with-extra-charges'
import { defaultRetentionTime } from '../../../shared/utils/constants'

/**
 * This workflow refreshes a cart's extra charges by:
 * 1. Removing existing extra charges from cart_order_extra_charge table
 * 2. Evaluating applicable extra charges based on current cart state (only if cart has items)
 * 3. Storing new extra charges in cart_order_extra_charge table
 *
 * This should be called whenever cart content changes that might affect extra charge rules.
 * This replaces the line item metadata approach with a dedicated table storage.
 */
export const refreshCartExtraChargesTableWorkflow = createWorkflow({
    name: 'refresh-cart-extra-charges-table',
    store: true,
    retentionTime: defaultRetentionTime
  },
  function (input: {
    cart_id: string
    scope?: any
    fields?: string[]
  }) {
    // Get cart context for rule evaluation
    const cartContext = getCartContextStep(input.cart_id)

    // Remove existing extra charges from cart_order_extra_charge table
    const removedChargeIds = removeCartExtraChargesStep(input.cart_id)

    // Evaluate applicable extra charges only if cart has items
    const applicableChargesResult = when(
      'check-cart-has-items',
      { cartContext },
      ({ cartContext }) => {
        return cartContext.cart.items && cartContext.cart.items.length > 0
      }
    ).then(() => {
      return evaluateExtraChargeRulesStep(cartContext)
    })

    // Transform to provide default empty array if no items in cart
    const applicableCharges = transform(
      { applicableChargesResult },
      ({ applicableChargesResult }) => {
        return applicableChargesResult || []
      }
    )

    // Store applicable charges in cart_order_extra_charge table (only if there are charges to store)
    const storedChargeIdsResult = when(
      'check-has-applicable-charges',
      { applicableCharges },
      ({ applicableCharges }) => {
        return applicableCharges.length > 0
      }
    ).then(() => {
      return storeCartExtraChargesStep({
        cartId: input.cart_id,
        applicableCharges,
        cartContext
      })
    })

    // Transform to provide default empty array if no charges to store
    const storedChargeIds = transform(
      { storedChargeIdsResult },
      ({ storedChargeIdsResult }) => {
        return storedChargeIdsResult || []
      }
    )

    // Get updated cart with extra charges
    const cartWithExtraCharges = refetchCartWithExtraChargesStep({
      cartId: input.cart_id,
      // scope: input.scope || null, // Will be resolved in the step
      fields: input.fields || ['id', 'items.*', 'total', 'subtotal', 'shipping_total', 'tax_total', 'discount_total', 'extra_charges', 'extra_charge_total']
    })

    return new WorkflowResponse({
      cart: cartWithExtraCharges,
      applied_charges: applicableCharges,
      removed_charge_ids: removedChargeIds,
      stored_charge_ids: storedChargeIds
    })
  }
)
