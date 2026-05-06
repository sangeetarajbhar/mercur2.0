import {
  createWorkflow,
  WorkflowResponse,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { prepareOrderSQSMessagesStep } from "./prepare-order-sqs-messages"
import { sendToSQSStep } from "./send-to-sqs"
import { storeWorkflow } from '../../../shared/utils/constants'

type SendOrdersToSQSFromOrderIdsInput = {
  orderIds: string[]
}

export const sendOrdersToSQSFromOrderIdsWorkflow = createWorkflow({
  name: "send-orders-to-sqs-from-order-ids-workflow",
  store: storeWorkflow,
},
  (input: SendOrdersToSQSFromOrderIdsInput) => {
    // Guard / normalize orderIds
    const orderIds = transform({ input }, ({ input }) => input.orderIds ?? [])

    // 1) Query order_extra_detail
    const locationDetails = when(
      "load-order-extra-details",
      { orderIds },
      ({ orderIds }) => orderIds.length > 0
    ).then(() => {
      return useQueryGraphStep({
        entity: "order_extra_detail",
        fields: ["id", "order_id", "marketplace_order_id"],
        filters: transform(
          { orderIds },
          ({ orderIds }) => ({
            order_id: orderIds
          })
        ),
      }).config({ name: "order-extra-detail-query" })
    })

    // 2) Transform to orderExtraDetails array
    const orderExtraDetails = transform(
      { locationDetails },
      ({ locationDetails }) => {
        if (!locationDetails?.data?.length) {
          return []
        }

        return locationDetails.data.map(
          (detail: {
            id: string
            order_id: string
            marketplace_order_id: string
          }) => ({
            id: detail.id,
            order_id: detail.order_id,
            marketplace_order_id: detail.marketplace_order_id,
          })
        )
      }
    )

    // 3) Prepare SQS messages
    const sqsMessages = prepareOrderSQSMessagesStep({ orderExtraDetails })

    // 4) Send messages to SQS if any
    when(
      "send-sqs-messages",
      { sqsMessages },
      ({ sqsMessages }) => sqsMessages.length > 0
    ).then(() => {
      return sendToSQSStep({
        messages: sqsMessages,
        queueUrl: process.env.AWS_SQS_ORDER_QUEUE_URL,
      }).config({ name: "send-orders-to-sqs-from-order-ids" })
    })

    // Nothing particular to return
    return new WorkflowResponse({ success: true })
  }
)
