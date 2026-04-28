import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { sendSQSMessage } from '../shared/utils/sqs'

import sellerOrder from '@mercurjs/core-plugin/links/order-seller-link'

export default async function returnCreatedSQSHandler({
  event,
  container
}: SubscriberArgs<{ order_id: string; items: Array<{ id: string; quantity: number; reason_id?: string; note?: string }> }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { order_id, items } = event.data

  if (!order_id || !items || items.length === 0) {
    console.warn('[Return Created SQS] Missing order_id or items in event data')
    return
  }

  try {
    // Query the return by order_id
    const { data: returns } = await query.graph({
      entity: 'return',
      fields: [
        'id',
        'display_id',
        'order_id',
        'location_id',
        'fulfillments.location_id',
        'items.*',
        'items.item_id',
        'items.quantity',
        'items.reason.*',
        'items.reason.id',
        'items.reason.value',
        'order.display_id',
        'order.id'
      ],
      filters: {
        order_id: order_id
      }
    })

    if (!returns || returns.length === 0) {
      console.warn(`[Return Created SQS] No return found for order_id: ${order_id}`)
      return
    }

    // Match return by items
    const eventItemIds = new Set(items.map((item: any) => item.id))
    const returnRecord = returns.find((ret: any) => {
      if (!ret.items || ret.items.length !== items.length) {
        return false
      }
      const returnItemIds = new Set(ret.items.map((item: any) => item.item_id))
      return eventItemIds.size === returnItemIds.size && 
             [...eventItemIds].every(id => returnItemIds.has(id))
    })
    
    if (!returnRecord) {
      console.warn(`[Return Created SQS] No matching return found for order_id: ${order_id}`)
      return
    }

    // Query seller-order link to get seller ID
    const { data: sellerOrderLinks } = await query.graph({
      entity: sellerOrder.entryPoint,
      fields: ['seller_id', 'order_id'],
      filters: {
        order_id: order_id
      }
    })

    if (!sellerOrderLinks || sellerOrderLinks.length === 0) {
      console.warn(`[Return Created SQS] No seller found for order_id: ${order_id}`)
      return
    }

    const sellerId = sellerOrderLinks[0].seller_id

    // Query order_extra_detail to get marketplace_order_id
    const { data: orderExtraDetails } = await query.graph({
      entity: 'order_extra_detail',
      fields: ['marketplace_order_id'],
      filters: {
        order_id: order_id
      }
    }) as any

    if (!orderExtraDetails || orderExtraDetails.length === 0) {
      console.warn(`[Return Created SQS] No order_extra_detail found for order_id: ${order_id}`)
      return
    }

    const marketplaceOrderId = orderExtraDetails[0]?.marketplace_order_id

    // Query return location to get partner_wh_code
    let returnLocationCode = ''
    // Get location_id from fulfillments first, fallback to return's location_id
    const locationId = returnRecord?.fulfillments?.[0]?.location_id || (returnRecord as any)?.location_id
    
    if (locationId) {
      // Get return_location_id from order location's extension
      const { data: orderLocations } = await query.graph({
        entity: 'stock_location',
        fields: [
          'stock_location_extension.return_location_id'
        ],
        filters: {
          id: locationId
        }
      })

      const returnLocationId = orderLocations?.[0]?.stock_location_extension?.return_location_id
      
      if (returnLocationId) {
        // Query stock_location_section directly to get partner_wh_code
        const { data: stockLocationSections } = await query.graph({
          entity: 'stock_location_section',
          fields: ['partner_wh_code'],
          filters: {
            stock_location_id: returnLocationId
          }
        })

        returnLocationCode = stockLocationSections?.[0]?.partner_wh_code || ''
      }
    }

    // Map line items
    const lineItems = returnRecord.items.map((item: any) => {
      const originalItem = items.find((i: any) => i.id === item.item_id)
      
      return {
        lineItemId: item.item_id,
        reason: item.reason?.value  || '',
        reasonCode:  item.reason?.value  || '',
        returnLocationCode: returnLocationCode
      }
    })

    // Prepare SQS message
    const messageBody = {
      operation: 'createReturn',
      returnEvent: 'CUSTOMER_RETURN',
      marketplaceOrderId: marketplaceOrderId,
      returnId: returnRecord.id,
      sellerId: sellerId,
      lineItems: lineItems
    }

    // Send to SQS using shared utility
    await sendSQSMessage({
      message: {
        body: messageBody
      },
      queueUrl: process.env.AWS_ZILO_RETURN_QUEUE_URL
    })
  } catch (error) {
    console.error('[Return Created SQS] Error processing return_created event:', error instanceof Error ? error.message : error)
  }
}

export const config: SubscriberConfig = {
  event: 'return_created',
  context: {
    subscriberId: 'return-created-sqs-handler'
  }
}

