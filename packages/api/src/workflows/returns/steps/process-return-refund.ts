import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { processAdminPaymentRefundV4Workflow } from "../../admin-payment-refund-v4/workflows"
import type { ProcessAdminPaymentRefundV4Output } from "../../admin-payment-refund-v4/steps/process-admin-payment-refund-v4"

export interface ProcessReturnRefundInput {
  return_id: string
  order: {
    id: string
    items: Array<{
      id: string
      order_line_item_extension?: {
        item_total: number
      }
    }>
    payment_collections: Array<{
      payment_sessions: Array<{
        provider_id: string
        payment?: {
          id: string
        }
      }>
    }>
    split_order_payment?: {
      id: string
    }
  }
  return_item_ids: string[]
  updated_by: string
}

export interface ProcessReturnRefundOutput {
  refund_processed: boolean
  payment_id: string | null
  total_refund_amount: number
}

export const processReturnRefundStep = createStep(
  "process-return-refund",
  async (
    input: ProcessReturnRefundInput,
    { container }
  ): Promise<StepResponse<ProcessReturnRefundOutput>> => {
    const { return_id, order, return_item_ids, updated_by } = input

    const paymentId = order?.payment_collections?.[0]?.payment_sessions?.[0]?.payment?.id
    const splitOrderPaymentId = order?.split_order_payment?.id

    // If no split order payment, skip refund processing
    if (!splitOrderPaymentId) {
      return new StepResponse({
        refund_processed: false,
        payment_id: null,
        total_refund_amount: 0,
      })
    }

    if (!paymentId) {
      return new StepResponse({
        refund_processed: false,
        payment_id: null,
        total_refund_amount: 0,
      })
    }

    // Build list of items with amounts to refund
    const itemsToRefund: Array<{ order_line_item_id: string; amount: number }> = []
    let totalRefundAmount = 0

    for (const returnItemId of return_item_ids) {
      const orderItem = order.items?.find((item: any) => item.id === returnItemId)
      const amount = orderItem?.order_line_item_extension?.item_total
      if (amount && amount > 0) {
        itemsToRefund.push({ order_line_item_id: returnItemId, amount })
        totalRefundAmount += amount
      }
    }

    // If no amount to refund, skip
    if (totalRefundAmount <= 0 || itemsToRefund.length === 0) {
      return new StepResponse({
        refund_processed: false,
        payment_id: paymentId || null,
        total_refund_amount: 0,
      })
    }

    // Call processAdminPaymentRefundV4Workflow for each item (includes Razorpay Payout for COD when enabled)
    let lastResult: ProcessAdminPaymentRefundV4Output | null = null

    for (let i = 0; i < itemsToRefund.length; i++) {
      const { order_line_item_id, amount } = itemsToRefund[i]
      const isLastItem = i === itemsToRefund.length - 1

      const { result } = await processAdminPaymentRefundV4Workflow(container).run({
        input: {
          paymentId,
          return_id,
          amount,
          split_order_payment_id: splitOrderPaymentId,
          order_line_item_id,
          actor_id: updated_by,
          payment_fields: ["*"],
          skip_update_return_status: !isLastItem,
        },
      })
      lastResult = result
    }

    return new StepResponse({
      refund_processed: true,
      payment_id: (lastResult?.payment as { id?: string })?.id ?? paymentId,
      total_refund_amount: totalRefundAmount,
    })
  }
)
