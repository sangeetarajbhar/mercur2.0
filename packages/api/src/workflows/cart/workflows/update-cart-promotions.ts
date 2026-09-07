import { PromotionActions } from "@medusajs/framework/utils"
import {
  createHook,
  createWorkflow,
  parallelize,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { cartFieldsForRefreshSteps } from "../utils/fields"
import {
  createLineItemAdjustmentsStep,
  createShippingMethodAdjustmentsStep,
  removeShippingMethodAdjustmentsStep,
  useRemoteQueryStep,
  updateCartPromotionsStep,
  validateCartStep,
  acquireLockStep,
  releaseLockStep
  } from "@medusajs/medusa/core-flows"

  import {prepareAdjustmentsFromPromotionActionsStep ,removeLineItemAdjustmentsStep , getActionsToComputeFromPromotionsStep , 
    getPromotionCodesToApply, removeCartPromotionsStep, validateNoOrderSetForCartStep} from "../steps"
  import { refreshPaymentCollectionForCartWorkflow } from '../steps'

/**
 * The details of the promotion updates on a cart.
 */
export type UpdateCartPromotionsWorkflowInput = {
  /**
   * The cart's ID.
   */
  cart_id?: string
  /**
   * The Cart reference.
   */
  cart?: any
  /**
   * The promotion codes to add to the cart, remove from the cart,
   * or replace all existing promotions in the cart.
   */
  promo_codes?: string[]
  /**
   * The action to perform with the specified promotion codes.
   */
  action?:
    | PromotionActions.ADD
    | PromotionActions.REMOVE
    | PromotionActions.REPLACE

  /**
   * If true, promotions that no longer produce adjustments will be silently removed
   * instead of throwing an error. Intended for cart refresh flows.
   */
  silent_remove?: boolean

  /**
   * Wether to force the refresh of the cart payment collection. If the caller doesn't refresh it explicitly,
   * you should probably set this property to true.
   */
  force_refresh_payment_collection?: boolean
}

export const updateCartPromotionsWorkflowId = "update-cart-promotions-v2"
/**
 * This workflow updates a cart's promotions, applying or removing promotion codes from the cart. It also computes the adjustments
 * that need to be applied to the cart's line items and shipping methods based on the promotions applied. This workflow is used by
 * [Add Promotions Store API Route](https://docs.medusajs.com/api/store#carts_postcartsidpromotions).
 *
 * You can use this workflow within your own customizations or custom workflows, allowing you to update a cart's promotions within your custom flows.
 *
 * @example
 * const { result } = await updateCartPromotionsWorkflow(container)
 * .run({
 *   input: {
 *     cart_id: "cart_123",
 *     promo_codes: ["10OFF"],
 *     // imported from @medusajs/framework/utils
 *     action: PromotionActions.ADD,
 *   }
 * })
 *
 * @summary
 *
 * Update a cart's applied promotions to add, replace, or remove them.
 *
 * @property hooks.validate - This hook is executed before all operations. You can consume this hook to perform any custom validation. If validation fails, you can throw an error to stop the workflow execution.
 */
export const updateCartPromotionsWorkflow = createWorkflow({
  name: updateCartPromotionsWorkflowId
},
  (input: WorkflowData<UpdateCartPromotionsWorkflowInput>) => {
    // Trim all promotion codes at the workflow entry point to handle whitespace
    const sanitizedInput = transform({ input }, ({ input }) => {
      return {
        ...input,
        promo_codes: input.promo_codes?.map(code => code.trim()) || []
      }
    })

    // Extract cart_id early for lock acquisition
    // This ensures we can acquire the lock before any cart operations to prevent race conditions
    const cartId = transform({ sanitizedInput }, ({ sanitizedInput }) => {
      const id = sanitizedInput.cart_id || sanitizedInput.cart?.id
      if (!id) {
        throw new Error("Cart ID is required for promotion updates")
      }
      return id
    })

    const fetchCart = when("should-fetch-cart", { input: sanitizedInput }, ({ input }) => {
      return !input.cart
    }).then(() => {
      return useRemoteQueryStep({
        entry_point: "cart",
        fields: cartFieldsForRefreshSteps,
        variables: { id: sanitizedInput.cart_id },
        list: false,
      }).config({ name: "fetch-cart" })
    })


    const cart = transform({ fetchCart, sanitizedInput }, ({ fetchCart, sanitizedInput }) => {
      return sanitizedInput.cart ?? fetchCart
    })


    validateCartStep({ cart })
    validateNoOrderSetForCartStep({ cartId })

    acquireLockStep({
      key: cartId,
      timeout: 2,
      ttl: 10,
    })


    const validate = createHook("validate", {
      input,
      cart: cart,
    })

    // when("run-promo-updates-when-no-order-set", { hasOrderSet }, ({ hasOrderSet }) => {
    //   return !hasOrderSet
    // }).then(() => {
      const promo_codes = transform({ input }, (data) => {
        return (data.input.promo_codes || []) as string[]
      })

      const action = transform({ input }, (data) => {
        return data.input.action || PromotionActions.ADD
      })

      const silent_remove = transform({ input }, (data) => {
        return Boolean((data.input as any)?.silent_remove)
      })

      const promotionCodesToApplyResult = getPromotionCodesToApply({
        cart: cart,
        promo_codes,
        action: action as PromotionActions,
      })

      const promotionCodesToApply = transform(
        { promotionCodesToApplyResult },
        ({ promotionCodesToApplyResult }) => {
          return promotionCodesToApplyResult as string[]
        }
      )

      const promotionCodesToRemove = transform({ input, action }, ({ input, action }) => {
        const codes = (() => {
          if (action === PromotionActions.REMOVE) {
            return input.promo_codes || []
          } else if (action === PromotionActions.REPLACE) {
            // For REPLACE, we need to remove ALL existing promotions
            // This will be handled by removing all existing adjustment IDs
            return []
          }
          return []
        })()



        return codes
      })

      const actionsResult = getActionsToComputeFromPromotionsStep({
        cart: cart,
        promotionCodesToApply,
        action: action as string,
      })

      // Extract validated promotion codes from the result
      const validatedPromotionCodes = transform({ actionsResult }, ({ actionsResult }) => {
        if (actionsResult && typeof actionsResult === 'object' && 'validatedPromotionCodes' in actionsResult) {
          return (actionsResult as any).validatedPromotionCodes || promotionCodesToApply
        }
        return promotionCodesToApply
      })

      const {
        shippingMethodAdjustmentsToCreate,
        shippingMethodAdjustmentIdsToRemove,
        filteredLineItemAdjustments,
        finalComputedPromotionCodes,
        finalAdjustmentIdsToRemove,
      } = prepareAdjustmentsFromPromotionActionsStep({
        actions: (actionsResult as any)?.actions || actionsResult,
        cart_id: cart.id as string,
        validatedPromotionCodes,
        freshCart: cart,
        action: action as string,
        promotionCodesToRemove,
        actionsResult,
        promo_codes,
        silent_remove,
      })

      // Handle different actions - simplified to avoid duplicate step names
      // For REMOVE action, use REPLACE to properly set remaining codes
      const updateAction = transform({ action, silent_remove }, ({ action, silent_remove }) => {
        // For silent refresh flows, always REPLACE so cart_promotion mirrors the computed codes
        // (dropping any invalid/expired codes without error).
        if (silent_remove) {
          return PromotionActions.REPLACE
        }

        if (action === PromotionActions.REMOVE) {
          return PromotionActions.REPLACE
        }
        return action
      })

      // Log the final promotion codes being passed to updateCartPromotionsStep
      const promotionIdsToInsert = transform({ finalComputedPromotionCodes, cart }, ({ finalComputedPromotionCodes, cart }) => {
        if (!cart) {
          return { codes: finalComputedPromotionCodes || [], cartId: '', codesToRemove: [] }
        }

        // Identify codes that need to be removed from cart_promotion table
        // This happens when codes are overridden (different campaigns or standalone conflicts)
        const existingCodes = cart.promotions?.map((p: any) => p?.code).filter(Boolean) || []
        const codesToRemove = existingCodes.filter((code: string) =>
          !finalComputedPromotionCodes.includes(code)
        )


        return {
          codes: finalComputedPromotionCodes,
          cartId: cart.id,
          codesToRemove: codesToRemove
        }
      })

      // CRITICAL: Remove adjustments FIRST (sequentially) to prevent race conditions
      // prepareAdjustmentsFromPromotionActionsStep already finds all adjustments that need to be removed
      // So we just need to remove them before creating new ones
      // IMPORTANT: This runs AFTER lock is acquired, so it will remove adjustments created by concurrent requests
      removeLineItemAdjustmentsStep({
        lineItemAdjustmentIdsToRemove: finalAdjustmentIdsToRemove,
        cartId: cart.id,
        promotionCodesToRemove: promotionCodesToRemove,
      })

      removeShippingMethodAdjustmentsStep({
        shippingMethodAdjustmentIdsToRemove,
      })

      // CRITICAL: Create adjustments FIRST, then update cart_promotion
      // This ensures adjustments exist before cart_promotion entries are created
      // Line item and shipping adjustments can be created in parallel (they're independent)
      parallelize(
        createLineItemAdjustmentsStep({ lineItemAdjustmentsToCreate: filteredLineItemAdjustments }),
        createShippingMethodAdjustmentsStep({
          shippingMethodAdjustmentsToCreate,
        })
      )

      // CRITICAL: Update cart_promotion AFTER adjustments are created
      // This ensures cart_promotion entries are only created when adjustments actually exist
      // Prevents race conditions where cart_promotion exists but adjustments don't
      updateCartPromotionsStep({
        id: cart.id,
        promo_codes: finalComputedPromotionCodes,
        action: updateAction,
      })

      // CRITICAL FIX: Clean up cart_promotion table when promotions are overridden
      when("remove-overridden-cart-promotions", { promotionIdsToInsert }, ({ promotionIdsToInsert }) => {
        return promotionIdsToInsert.codesToRemove && promotionIdsToInsert.codesToRemove.length > 0
      }).then(() => {
        removeCartPromotionsStep({
          cart_id: cart.id,
          promotion_codes_to_remove: promotionIdsToInsert.codesToRemove
        })
      })

      when(
        "check-force-refresh-payment-collection",
        { input },
        ({ input }) => input.force_refresh_payment_collection === true
      ).then(() => {
        refreshPaymentCollectionForCartWorkflow.runAsStep({
          input: { cart },
        })
      })

      // CRITICAL: Release lock before refreshing payment collection
      // refreshPaymentCollectionForCartWorkflow acquires its own lock, so we release ours first
      // This prevents deadlock and allows the payment collection refresh to proceed immediately
      releaseLockStep({
        key: cartId,
      })

      // CRITICAL: Refresh payment collection to sync with updated cart totals
      // This ensures payment collection amount matches the new cart total after promotion adjustments
      // Medusa automatically recalculates cart totals (discount_total, subtotal, total) based on adjustments,
      // but we need to explicitly refresh the payment collection to sync it with the new totals
      // refreshPaymentCollectionForCartWorkflow.runAsStep({
      //   input: { cart_id: cartId }
      // })


    return new WorkflowResponse(void 0, {
      hooks: [validate],
    })
  }
)
