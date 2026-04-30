import {
  WorkflowResponse,
  createWorkflow
} from '@medusajs/framework/workflows-sdk'

import { fetchReturnAndOrderForReceiveRefundStep } from '../steps/fetch-return-and-order-for-receive-refund'
import { processReturnRefundUnifiedStep } from '../steps/process-return-refund-unified'
import { runReceiveFlowStep } from '../steps/run-receive-flow-step'

export interface ReceiveAndRefundUnifiedWorkflowInput {
  return_id: string
  confirmed_by: string
  filterableFields?: Record<string, unknown>
  queryConfigFields?: string[]
}

export const receiveAndRefundUnifiedWorkflow = createWorkflow(
  {
    name: 'receive-and-refund-unified'
  },
  (input: ReceiveAndRefundUnifiedWorkflowInput) => {
    /* -------------------- FETCH & VALIDATE RETURN ITEMS -------------------- */
    const fetchResult = fetchReturnAndOrderForReceiveRefundStep({
      return_id: input.return_id
    })

    /* -------------------- MARKED RETURN ITEMS RECEIVED OR SKIPPED THIS STEP IF ALREADY IT IS RECEIVED -------------------- */
    const receiveResult = runReceiveFlowStep({
      return_id: input.return_id,
      receiveItems: fetchResult.receiveItems,
      confirmed_by: input.confirmed_by,
      filterableFields: input.filterableFields,
      queryConfigFields: input.queryConfigFields
    })

    /* -------------------- REFUND AMOUNT OF ITEM WITH COD PAYOUT -------------------- */
    const refundResult = processReturnRefundUnifiedStep({
      return_id: input.return_id,
      orderId: fetchResult.orderId,
      totalRefundAmount: fetchResult.totalRefundAmount,
      return_item_ids: fetchResult.return_item_ids,
      paymentId: fetchResult.paymentId,
      splitOrderPaymentId: fetchResult.splitOrderPaymentId,
      isCod: fetchResult.isCod,
      updated_by: input.confirmed_by
    })

    return new WorkflowResponse({
      order_preview: receiveResult.order_preview,
      return: receiveResult.return,
      payment_id: refundResult.payment_id,
      refund_processed: refundResult.refund_processed,
      total_refund_amount: refundResult.total_refund_amount
    })
  }
)
