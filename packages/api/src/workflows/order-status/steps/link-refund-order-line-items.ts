import { createStep } from '@medusajs/framework/workflows-sdk'

import { createRefundOrderLineItemLinksWorkflow } from '../../payment/workflows'

type LinkRefundOrderLineItemsInput = {
  paymentId: string
  lineItemIds: string[]
  lineItemAmounts?: Array<{
    lineItemId: string
    amount: number
  }>
}

export const linkRefundOrderLineItemsStep = createStep(
  'link-refund-order-line-items',
  async (input: LinkRefundOrderLineItemsInput | null, { container }) => {
    if (!input?.paymentId || !input.lineItemIds?.length) {
      return
    }

    const workflow = createRefundOrderLineItemLinksWorkflow(container)

    // Create a map of lineItemId -> amount for easy lookup
    const amountMap = new Map(
      (input.lineItemAmounts ?? []).map(item => [item.lineItemId, item.amount])
    )

    for (const lineItemId of input.lineItemIds) {
      // Get the amount for this line item, default to 0 if not found
      const amount = amountMap.get(lineItemId) ?? 0

      await workflow.run({
        input: {
          payment_id: input.paymentId,
          order_line_item_id: lineItemId,
          amount
        },
        throwOnError: true
      })
    }
  }
)

