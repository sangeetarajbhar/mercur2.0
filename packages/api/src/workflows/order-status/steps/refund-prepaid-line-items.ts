import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { refundSplitOrderPaymentWorkflow } from '../../split-order-payment/workflows/refund-split-order-payment'
import { createRefundOrderLineItemLinksWorkflow } from '../../payment/workflows/create-refund-order-line-item-links'

type RefundPrepaidLineItemsInput = {
  splitOrderPaymentId?: string
  lineItemAmounts: Array<{
    lineItemId: string
    amount: number
  }>
  paymentId?: string
}

export const refundPrepaidLineItemsStep = createStep(
  'refund-prepaid-line-items',
  async (input: RefundPrepaidLineItemsInput, { container }) => {
    if (!input.splitOrderPaymentId || !input.paymentId) {
      return new StepResponse<void>(undefined)
    }

    if (!input.lineItemAmounts?.length) {
      return new StepResponse<void>(undefined)
    }

    // Process each line item
    for (const lineItem of input.lineItemAmounts) {
      if (!lineItem.amount || lineItem.amount <= 0) {
        continue
      }

      // 1. Refund split order payment
      await refundSplitOrderPaymentWorkflow(container).run({
        input: {
          id: input.splitOrderPaymentId,
          amount: lineItem.amount
        }
      })

      // 2. Create refund order line item links
      await createRefundOrderLineItemLinksWorkflow(container).run({
        input: {
          payment_id: input.paymentId,
          order_line_item_id: lineItem.lineItemId,
          amount: lineItem.amount
        }
      })
    }

    return new StepResponse<void>(undefined)
  }
)

