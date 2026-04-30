import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  processAdminPaymentRefundV4Step,
  ProcessAdminPaymentRefundV4Input,
  ProcessAdminPaymentRefundV4Output,
} from "../steps"

/**
 * Admin Payment Refund V4 Workflow
 *
 * Refunds a payment with full logic:
 * - When ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND=false: Runs Medusa flows only
 *   (refund split order payment, create refund-order-line-item links, update return status)
 * - When ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND=true:
 *   - Prepaid: Same Medusa flows
 *   - COD: Razorpay Payout first, then Medusa flows
 *
 * Can be integrated from API routes, subscribers, scheduled jobs, or any other context.
 *
 * @example
 * ```ts
 * const { result } = await processAdminPaymentRefundV4Workflow(scope).run({
 *   input: {
 *     paymentId: "pay_xxx",
 *     return_id: "ret_xxx",
 *     amount: 1000,
 *     split_order_payment_id: "sop_xxx",
 *     order_line_item_id: "oli_xxx",
 *     actor_id: "user_xxx",
 *     payment_fields: ["*"],
 *   },
 * })
 * // result: { payment, return }
 * ```
 */
export const processAdminPaymentRefundV4Workflow = createWorkflow(
  "process-admin-payment-refund-v4",
  (input: ProcessAdminPaymentRefundV4Input) => {
    const result = processAdminPaymentRefundV4Step(input)
    return new WorkflowResponse<ProcessAdminPaymentRefundV4Output>(result)
  }
)
