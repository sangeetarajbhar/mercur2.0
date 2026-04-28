import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { sendSQSMessage } from '../shared/utils/sqs'

export default async function orderCancelledSQSHandler({
  event,
  container
}: SubscriberArgs<{ id: string; isRTO?: boolean; cancel_reason?: 'payment_failure' | 'payment_pending' }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { id: order_id, isRTO, cancel_reason } = event.data

  if (!order_id) {
    console.warn('[Order Cancelled SQS] Missing order_id in event data')
    return
  }

  if (isRTO) {
    // Skip SQS for RTO (Return to Origin) - handled separately
    return
  }

  if (cancel_reason === 'payment_failure' || cancel_reason === 'payment_pending') {
    // Skip SQS for payment failure or payment pending cancellations - handled via other flows
    return
  }

  try {
    // Query order with items
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'items.id',
        'items.title',
        'canceled_at'
      ],
      filters: {
        id: order_id
      }
    })

    if (!orders || orders.length === 0) {
      console.warn(`[Order Cancelled SQS] No order found for order_id: ${order_id}`)
      return
    }

    const order = orders[0]

    // Query order_extra_detail to get marketplace_order_id
    const { data: orderExtraDetails } = await query.graph({
      entity: 'order_extra_detail',
      fields: ['marketplace_order_id'],
      filters: {
        order_id: order_id
      }
    })

    if (!orderExtraDetails || orderExtraDetails.length === 0) {
      console.warn(`[Order Cancelled SQS] No order_extra_detail found for order_id: ${order_id}`)
      return
    }

    const marketplaceOrderId = orderExtraDetails[0].marketplace_order_id

    // Map line items
    const lineItems = (order.items || []).map((item: any) => ({
      lineItemId: item.id,
      reason: 'Customer requested cancellation before processing',
      reasonCode: 'CUSTOMER_CANCELLED'
    }))

    if (lineItems.length === 0) {
      console.warn(`[Order Cancelled SQS] No line items found for order_id: ${order_id}`)
      return
    }

    // Prepare SQS message
    const messageBody = {
      operation: 'updateOrder',
      orderEvent: 'cancellation',
      marketplaceOrderId: marketplaceOrderId,
      eventTimestamp: new Date().toISOString(),
      lineItems: lineItems
    }

    // Send to SQS using shared utility
    await sendSQSMessage({
      message: {
        body: messageBody
      },
      queueUrl: process.env.AWS_SQS_ORDER_QUEUE_URL
    })

  } catch (error) {
    console.error('[Order Cancelled SQS] Error processing order.canceled event:', error instanceof Error ? error.message : error)
  }
}

export const config: SubscriberConfig = {
  event: 'order.canceled',
  context: {
    subscriberId: 'order-cancelled-sqs-handler'
  }
}


