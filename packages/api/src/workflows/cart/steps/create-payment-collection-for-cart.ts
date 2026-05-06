import { CartDTO, CreatePaymentCollectionForCartWorkflowInputDTO, PaymentCollectionDTO } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { WorkflowData, WorkflowResponse, createStep, createWorkflow, parallelize, transform } from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  createPaymentCollectionsStep,
  createRemoteLinkStep,
  releaseLockStep,
  useRemoteQueryStep,
  validateCartStep
} from '@medusajs/medusa/core-flows'
import { refetchCartWithExtraChargesStep } from './refetch-cart-with-extra-charges'

/**
 * The details of the cart to validate its payment collection.
 */
export type ValidateExistingPaymentCollectionStepInput = {
  /**
   * The cart to validate.
   */
  cart: CartDTO & { payment_collection?: any }
}

/**
 * This step validates that a cart doesn't have a payment collection.
 * If the cart has a payment collection, the step throws an error.
 *
 * :::tip
 *
 * You can use the {@link retrieveCartStep} to retrieve a cart's details.
 *
 * :::
 *
 * @example
 * const data = validateExistingPaymentCollectionStep({
 *   cart: {
 *     // other cart details...
 *     payment_collection: {
 *       id: "paycol_123",
 *       // other payment collection details.
 *     }
 *   }
 * })
 */
export const validateExistingPaymentCollectionStep = createStep(
  "validate-existing-payment-collection",
  ({ cart }: ValidateExistingPaymentCollectionStepInput) => {
    if (cart.payment_collection) {
      throw new Error(`Cart ${cart.id} already has a payment collection`)
    }
  }
)

export const createPaymentCollectionForCartWorkflowId =
  "create-payment-collection-for-cart-v2"
/**
 * This workflow creates a payment collection for a cart. It's executed by the
 * [Create Payment Collection Store API Route](https://docs.medusajs.com/api/store#payment-collections_postpaymentcollections).
 *
 * You can use this workflow within your own customizations or custom workflows, allowing you to wrap custom logic around adding creating a payment collection for a cart.
 *
 * @example
 * const { result } = await createPaymentCollectionForCartWorkflow(container)
 * .run({
 *   input: {
 *     cart_id: "cart_123",
 *     metadata: {
 *       sandbox: true
 *     }
 *   }
 * })
 *
 * @summary
 *
 * Create payment collection for cart.
 */
export const createPaymentCollectionForCartWorkflow = createWorkflow(
  {
    name: createPaymentCollectionForCartWorkflowId,
    idempotent: false,
  },
  (
    input: WorkflowData<CreatePaymentCollectionForCartWorkflowInputDTO>
  ): WorkflowResponse<PaymentCollectionDTO> => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    const cart = useRemoteQueryStep({
      entry_point: "cart",
      fields: [
        "id",
        "completed_at",
        "currency_code",
        "total",
        "raw_total",
        "subtotal",
        "shipping_total",
        "tax_total",
        "discount_total",
        "payment_collection.id",
      ],
      variables: { id: input.cart_id },
      throw_if_key_not_found: true,
      list: false,
    })

    parallelize(
      validateCartStep({ cart }),
      validateExistingPaymentCollectionStep({ cart })
    )

    // Fetch cart with extra charges to get accurate total
    const cartWithExtraCharges = refetchCartWithExtraChargesStep({
      cartId: input.cart_id,
      // scope: null, // Will be resolved in the step
      fields: [
        'id',
        'total',
        'subtotal',
        'shipping_total',
        'tax_total',
        'discount_total',
        'extra_charge_total',
        'extra_charges',
        "completed_at",
        "currency_code",
        "raw_total",
        "payment_collection.id",
      ]
    })

    const paymentData = transform({ cart, cartWithExtraCharges }, ({ cart, cartWithExtraCharges }) => {
      // Use cart with extra charges if available, otherwise fall back to original cart
      const finalCart = cartWithExtraCharges || cart

      // Calculate total amount including extra charges
      const totalAmount = finalCart.total || cart.raw_total

      // Prepare metadata to store charge breakdown
      const metadata = {
        cart_id: cart.id,
        subtotal: finalCart.subtotal || 0,
        shipping_total: finalCart.shipping_total || 0,
        tax_total: finalCart.tax_total || 0,
        discount_total: finalCart.discount_total || 0,
        extra_charge_total: finalCart.extra_charge_total || 0,
        base_total: cart.raw_total || 0,
        final_total: totalAmount,
        extra_charges: finalCart.extra_charges || [],
        created_at: new Date().toISOString()
      }

      return {
        currency_code: cart.currency_code,
        amount: totalAmount,
        metadata: metadata
      }
    })

    const created = createPaymentCollectionsStep([paymentData])

    const cartPaymentLink = transform(
      { cartId: input.cart_id, created },
      (data) => {
        return [
          {
            [Modules.CART]: { cart_id: data.cartId },
            [Modules.PAYMENT]: { payment_collection_id: data.created[0].id },
          },
        ]
      }
    )

    createRemoteLinkStep(cartPaymentLink).config({
      name: "cart-payment-collection-link",
    })

    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse(created[0])
  }
)
