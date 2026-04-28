import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { sendMultipleSQSMessages, SQSMessage } from '../shared/utils/sqs'

export default async function orderSetDeliveredSQSHandler({
  event,
  container
}: SubscriberArgs<{ order_set_id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { order_set_id } = event.data

  if (!order_set_id) {
    console.warn('[Order Set Delivered SQS] Missing order_set_id in event data')
    return
  }

  try {
    // Query order_set with orders, fulfillments, and seller info
    const { data: orderSets } = await query.graph({
      entity: 'order_set',
      fields: [
        'id',
        'orders.id',
        'orders.fulfillments.id',
        'orders.fulfillments.delivered_at',
        'orders.seller.id'
      ],
      filters: {
        id: order_set_id
      }
    })

    const orderSet = (orderSets as any[])?.[0]

    if (!orderSet || !orderSet.orders || orderSet.orders.length === 0) {
      console.warn(`[Order Set Delivered SQS] No order set or orders found for order_set_id: ${order_set_id}`)
      return
    }

    // Collect all fulfillments with their seller info
    const messages: SQSMessage[] = []

    for (const order of orderSet.orders) {
      const sellerId = order.seller?.id ?? null
      const fulfillments = order.fulfillments || []

      for (const fulfillment of fulfillments) {
        const attributes: Record<string, string> = {
          operation: 'updateOrder',
          orderEvent: 'delivered',
          shipmentId: fulfillment.id
        }

        if (sellerId) {
          attributes.sellerId = sellerId
        }

        messages.push({
          body: {
            operation: 'updateOrder',
            orderEvent: 'delivered',
            deliveredAt: fulfillment.delivered_at,
            shipmentId: fulfillment.id,
            sellerId: sellerId
          },
          attributes
        })
      }
    }

    if (messages.length === 0) {
      console.warn(`[Order Set Delivered SQS] No fulfillments found for order_set_id: ${order_set_id}`)
      return
    }

    // Send all messages to SQS
    await sendMultipleSQSMessages({
      messages,
      queueUrl: process.env.AWS_SQS_SHIPMENT_QUEUE_URL
    })

    console.log(`[Order Set Delivered SQS] Sent ${messages.length} SQS messages for order_set_id: ${order_set_id}`)
  } catch (error) {
    console.error('[Order Set Delivered SQS] Error processing order_set_delivered event:', error instanceof Error ? error.message : error)
  }
}

export const config: SubscriberConfig = {
  event: 'order_set_delivered',
  context: {
    subscriberId: 'order-set-delivered-sqs-handler'
  }
}
