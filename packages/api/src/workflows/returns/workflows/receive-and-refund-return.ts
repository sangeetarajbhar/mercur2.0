import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { fetchReturnWithOrderDetailsStep } from "../steps/fetch-return-with-order-details"
import { receiveReturnItemsStep } from "../steps/receive-return-items"
import { processReturnRefundStep } from "../steps/process-return-refund"

export interface ReceiveAndRefundReturnWorkflowInput {
  return_id: string
  confirmed_by: string
  filterableFields?: any
  queryConfigFields?: string[]
}

export interface ReceiveAndRefundReturnWorkflowOutput {
  order_preview: any
  return: any
  payment_id: string | null
  refund_processed: boolean
  total_refund_amount: number
}

export const receiveAndRefundReturnWorkflow = createWorkflow(
  "receive-and-refund-return",
  (input: ReceiveAndRefundReturnWorkflowInput) => {
    // Step 1: Fetch return with order details
    const fetchResult = fetchReturnWithOrderDetailsStep({
      return_id: input.return_id,
    })

    // Step 2: Receive return items
    const receiveResult = receiveReturnItemsStep({
      return_id: input.return_id,
      items: fetchResult.receiveItems,
      confirmed_by: input.confirmed_by,
      filterableFields: input.filterableFields,
      queryConfigFields: input.queryConfigFields,
    })

    // Prepare return item IDs for refund step
    const returnItemIds = transform(fetchResult, (data) => {
      return data.orderReturn.items?.map((item: any) => item.item_id) || []
    })

    // Step 3: Process refund
    const refundResult = processReturnRefundStep({
      return_id: input.return_id,
      order: fetchResult.order,
      return_item_ids: returnItemIds,
      updated_by: input.confirmed_by,
    })

    return new WorkflowResponse({
      order_preview: receiveResult.order_preview,
      return: receiveResult.return,
      payment_id: refundResult.payment_id,
      refund_processed: refundResult.refund_processed,
      total_refund_amount: refundResult.total_refund_amount,
    })
  }
)
