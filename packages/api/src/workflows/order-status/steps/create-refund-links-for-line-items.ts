import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

// import { createRefundOrderLineItemLinksWorkflow } from '../../payment/workflows'

type CreateRefundLinksInput = {
  paymentIds: string[]
  lineItemIds: string[]
}

export const createRefundLinksForLineItemsStep = createStep(
  'create-refund-links-for-line-items',
  async (input: CreateRefundLinksInput, { container }) => {
    const paymentIds = Array.from(new Set(input.paymentIds ?? [])).filter(Boolean)
    const lineItemIds = Array.from(new Set(input.lineItemIds ?? [])).filter(Boolean)

    if (!paymentIds.length || !lineItemIds.length) {
      return new StepResponse<void>(undefined)
    }

    // const workflow = createRefundOrderLineItemLinksWorkflow(container)

    // for (const paymentId of paymentIds) {
    //   for (const lineItemId of lineItemIds) {
    //     await workflow.run({
    //       input: {
    //         payment_id: paymentId,
    //         order_line_item_id: lineItemId,
    //         amount: 0
    //       },
    //       throwOnError: true
    //     })
    //   }
    // }

    return new StepResponse<void>(undefined)
  }
)

