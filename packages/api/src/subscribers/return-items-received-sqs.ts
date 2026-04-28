import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { sendSQSMessage } from '../shared/utils/sqs'

import sellerOrder from '@mercurjs/core-plugin/links/order-seller-link'

export default async function returnItemsReceivedSQSHandler({
  event,
  container
}: SubscriberArgs<{ return_id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { return_id } = event.data
  if (!return_id) {
    console.warn('[Return Items Received SQS] Missing return_id in event data')
    return
  }

  try {
    // Query the return to get order_id
    const { data: returns } = await query.graph({
      entity: 'return',
      fields: [
        'id',
        'order_id'
      ],
      filters: {
        id: return_id
      }
    })

    if (!returns || returns.length === 0) {
      console.warn(`[Return Items Received SQS] No return found for return_id: ${return_id}`)
      return
    }

    const returnRecord = returns[0]
    const orderId = returnRecord.order_id

    if (!orderId) {
      console.warn(`[Return Items Received SQS] No order_id found for return_id: ${return_id}`)
      return
    }

    // Query seller-order link to get seller ID
    const { data: sellerOrderLinks } = await query.graph({
      entity: sellerOrder.entryPoint,
      fields: ['seller_id', 'order_id'],
      filters: {
        order_id: orderId
      }
    })

    if (!sellerOrderLinks || sellerOrderLinks.length === 0) {
      console.warn(`[Return Items Received SQS] No seller found for order_id: ${orderId}`)
      return
    }

    const sellerId = sellerOrderLinks[0].seller_id

    // Query order_extra_detail to get marketplace_order_id
    const { data: orderExtraDetails } = await query.graph({
      entity: 'order_extra_detail',
      fields: ['marketplace_order_id'],
      filters: {
        order_id: orderId
      }
    })

    if (!orderExtraDetails || orderExtraDetails.length === 0) {
      console.warn(`[Return Items Received SQS] No order_extra_detail found for order_id: ${orderId}`)
      return
    }

    const marketplaceOrderId = orderExtraDetails[0].marketplace_order_id

    // Prepare SQS message
    const messageBody = {
      operation: 'updateReturn',
      returnEvent: 'completed',
      marketplaceOrderId: marketplaceOrderId,
      returnId: return_id,
      sellerId: sellerId,
      eventTimestamp: new Date()
    }

    // Send to SQS using shared utility
    await sendSQSMessage({
      message: {
        body: messageBody
      },
      queueUrl: process.env.AWS_ZILO_RETURN_QUEUE_URL
    })
    
    console.log(`[Return Items Received SQS] Successfully sent message for return_id: ${return_id}`)
  } catch (error) {
    console.error('[Return Items Received SQS] Error processing return_items_received event:', error instanceof Error ? error.message : error)
  }
}

export const config: SubscriberConfig = {
  event: 'return_items_received',
  context: {
    subscriberId: 'return-items-received-sqs-handler'
  }
}

