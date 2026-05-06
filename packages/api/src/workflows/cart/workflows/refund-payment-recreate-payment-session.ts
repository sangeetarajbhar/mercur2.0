import type {
  BigNumberInput,
  PaymentSessionDTO,
} from "@medusajs/framework/types"
import {
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { refundPaymentsWorkflow, createPaymentSessionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * The data to refund a payment and create a new payment session.
 */
export interface refundPaymentAndRecreatePaymentSessionWorkflowInput {
  /**
   * The ID of the payment collection to create payment sessions for.
   */
  payment_collection_id: string
  /**
   * The ID of the payment provider that the payment sessions are associated with.
   * This provider is used to later process the payment sessions and their payments.
   */
  provider_id: string
  /**
   * The ID of the customer that the payment session should be associated with.
   */
  customer_id?: string
  /**
   * Custom data relevant for the payment provider to process the payment session.
   * Learn more in [this documentation](https://docs.medusajs.com/resources/commerce-modules/payment/payment-session#data-property).
   */
  data?: Record<string, unknown>

  /**
   * Additional context that's useful for the payment provider to process the payment session.
   * Currently all of the context is calculated within the workflow.
   */
  context?: Record<string, unknown>

  /**
   * The ID of the payment to refund.
   */
  payment_id: string

  /**
   * The amount to refund.
   */
  amount: BigNumberInput

  /**
   * The note to attach to the refund.
   */
  note?: string
}

export const refundPaymentAndRecreatePaymentSessionWorkflowId =
  "custom-refund-payment-and-recreate-payment-session"
/**
 * This workflow refunds a payment and creates a new payment session.
 * 
 * This is particularly useful when a cart completion fails after payment capture.
 * The workflow will:
 * 1. Refund the captured payment
 * 2. Create a new payment session so the customer can retry
 *
 * @summary
 *
 * Refund a payment and create a new payment session.
 * 
 * @example
 * const { result } = await refundPaymentAndRecreatePaymentSessionWorkflow(container)
 *   .run({
 *     input: {
 *       payment_id: "pay_123",
 *       payment_collection_id: "paycol_123",
 *       provider_id: "pp_razorpay",
 *       amount: 1000,
 *       note: "Refunded due to order creation failure"
 *     }
 *   })
 */

export const refundPaymentAndRecreatePaymentSessionWorkflow = createWorkflow(
  {
    name: refundPaymentAndRecreatePaymentSessionWorkflowId,
  },
  (
    input: WorkflowData<refundPaymentAndRecreatePaymentSessionWorkflowInput>
  ): WorkflowResponse<PaymentSessionDTO> => {
    refundPaymentsWorkflow.runAsStep({
      input: [
        {
          payment_id: input.payment_id,
          note: input.note,
          amount: input.amount,
        },
      ],
    }).config({
            name: "refund-captured-payment",
          })

    const paymentSession = createPaymentSessionsWorkflow.runAsStep({
      input: {
        payment_collection_id: input.payment_collection_id,
        provider_id: input.provider_id,
        customer_id: input.customer_id,
        data: input.data,
      },
    }).config({
            name: "recreate-payment-session",
          })

    return new WorkflowResponse(paymentSession)
  }
)