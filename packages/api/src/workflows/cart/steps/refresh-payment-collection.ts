import { MathBN, isPresent } from "@medusajs/framework/utils";
import { WorkflowData, WorkflowResponse, createHook, createWorkflow, parallelize, transform, when } from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  deletePaymentSessionsWorkflow,
  releaseLockStep,
  updatePaymentCollectionStep,
  useRemoteQueryStep,
  validateCartStep
} from '@medusajs/medusa/core-flows'
import { refetchCartWithExtraChargesStep } from './refetch-cart-with-extra-charges'
/**
 * The details of the cart to refresh.
 */
export type RefreshPaymentCollectionForCartWorklowInput = {
  /**
   * The cart's ID.
   */
  cart_id?: string
  /**
   * The Cart reference.
   */
  cart?: any
}

export const refreshPaymentCollectionForCartWorkflowId =
  "refresh-payment-collection-for-cart-v2"
/**
 * This workflow refreshes a cart's payment collection, which is useful once the cart is created or when its details
 * are updated. If the cart's total changes to the amount in its payment collection, the payment collection's payment sessions are
 * deleted. It also syncs the payment collection's amount, currency code, and other details with the details in the cart.
 *
 * This workflow is used by other cart-related workflows, such as the {@link refreshCartItemsWorkflow} to refresh the cart's
 * payment collection after an update.
 *
 * You can use this workflow within your own customizations or custom workflows, allowing you to refresh the cart's payment collection after making updates to it in your
 * custom flows.
 *
 * @example
 * const { result } = await refreshPaymentCollectionForCartWorkflow(container)
 * .run({
 *   input: {
 *     cart_id: "cart_123",
 *   }
 * })
 *
 * @summary
 *
 * Refresh a cart's payment collection details.
 *
 * @property hooks.validate - This hook is executed before all operations. You can consume this hook to perform any custom validation. If validation fails, you can throw an error to stop the workflow execution.
 */
export const refreshPaymentCollectionForCartWorkflow = createWorkflow(
  {
    name: refreshPaymentCollectionForCartWorkflowId,
    idempotent: false,
  },
  (input: WorkflowData<RefreshPaymentCollectionForCartWorklowInput>) => {
    const shouldExecute = transform({ input }, ({ input }) => {
      return (
        !!input.cart_id || (!!input.cart && !!input.cart.payment_collection)
      )
    })

    const cartId = transform({ input }, ({ input }) => {
      return input.cart_id ?? input.cart?.id
    })

    const fetchCart = when("should-fetch-cart", { shouldExecute }, ({ shouldExecute }) => {
      return shouldExecute
    }).then(() => {
      return useRemoteQueryStep({
        entry_point: "cart",
        fields: [
          "id",
          "region_id",
          "currency_code",
          "total",
          "raw_total",
          "payment_collection.id",
          "payment_collection.raw_amount",
          "payment_collection.amount",
          "payment_collection.currency_code",
          "payment_collection.payment_sessions.id",
        ],
        variables: { id: cartId },
        throw_if_key_not_found: true,
        list: false,
      })
    })

    const cart = transform({ fetchCart, input }, ({ fetchCart, input }) => {
      return fetchCart ?? input.cart
    })

    // Fetch cart with extra charges to get accurate total
    const cartWithExtraCharges = refetchCartWithExtraChargesStep({
      cartId: cart.id,
      // scope: null, // Will be resolved in the step
      fields: [
        'id', 'total', 'subtotal', 'shipping_total', 'tax_total', 'discount_total',
        'extra_charge_total', 'extra_charges', 'raw_total', 'currency_code'
      ]
    })

    validateCartStep({ cart })

    acquireLockStep({
      key: cart.id,
      timeout: 2,
      ttl: 10,
    })

    const validate = createHook("validate", {
      input,
      cart,
    })

    when(
      "should-update-payment-collection",
      { cart, cartWithExtraCharges, shouldExecute },
      ({ cart, cartWithExtraCharges, shouldExecute }) => {
        // Use cart with extra charges if available, otherwise fall back to original cart
        const finalCart = cartWithExtraCharges || cart

        // Compare payment collection amount with cart total including extra charges
        const valueIsEqual = MathBN.eq(
          cart.payment_collection?.raw_amount ?? -1,
          finalCart.total || finalCart.raw_total
        )

        if (valueIsEqual) {
          return cart.payment_collection.currency_code !== finalCart.currency_code
        }

        return shouldExecute
      }
    ).then(() => {
      const deletePaymentSessionInput = transform(
        { paymentCollection: cart.payment_collection },
        (data) => {
          return {
            ids:
              data.paymentCollection?.payment_sessions
                ?.map((ps) => ps.id)
                ?.flat(1) || [],
          }
        }
      )

      const updatePaymentCollectionInput = transform({ cart, cartWithExtraCharges }, ({ cart, cartWithExtraCharges }) => {
        if (!isPresent(cart.payment_collection?.id)) {
          return
        }

        // Use cart with extra charges if available, otherwise fall back to original cart
        const finalCart = cartWithExtraCharges || cart

        return {
          selector: { id: cart.payment_collection.id },
          update: {
            amount: finalCart.total || finalCart.raw_total,
            currency_code: finalCart.currency_code,
          },
        }
      })

      parallelize(
        deletePaymentSessionsWorkflow.runAsStep({
          input: deletePaymentSessionInput,
        }),
        updatePaymentCollectionStep(updatePaymentCollectionInput)
      )
    })

    releaseLockStep({
      key: cart.id,
    })

    return new WorkflowResponse(void 0, {
      hooks: [validate] as any,
    })
  }
)
