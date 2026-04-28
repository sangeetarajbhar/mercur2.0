// import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
// import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
// import { sendSQSMessage } from '../shared/utils/sqs'

// import sellerOrder from '../links/seller-order'

// export default async function orderRtoSQSHandler({
//   event,
//   container
// }: SubscriberArgs<{ order_id: string }>) {
//   const query = container.resolve(ContainerRegistrationKeys.QUERY)
//   const { order_id } = event.data

//   if (!order_id) {
//     console.warn('[Order RTO SQS] Missing order_id in event data')
//     return
//   }

//   try {
//     // Query order with fulfillments and items
//     const { data: orders } = await query.graph({
//       entity: 'order',
//       fields: [
//         'id',
//         'items.id',
//         'fulfillments.id'
//       ],
//       filters: {
//         id: order_id
//       }
//     })

//     if (!orders || orders.length === 0) {
//       console.warn(`[Order RTO SQS] No order found for order_id: ${order_id}`)
//       return
//     }

//     const order = orders[0]

//     // Get fulfillment/shipment id (use the first fulfillment)
//     const fulfillmentId = order.fulfillments?.[0]?.id
//     if (!fulfillmentId) {
//       console.warn(`[Order RTO SQS] No fulfillment found for order_id: ${order_id}`)
//       return
//     }

//     // Query seller-order link to get seller ID
//     const { data: sellerOrderLinks } = await query.graph({
//       entity: sellerOrder.entryPoint,
//       fields: ['seller_id', 'order_id'],
//       filters: {
//         order_id: order_id
//       }
//     })

//     if (!sellerOrderLinks || sellerOrderLinks.length === 0) {
//       console.warn(`[Order RTO SQS] No seller found for order_id: ${order_id}`)
//       return
//     }

//     const sellerId = sellerOrderLinks[0].seller_id

//     // Query order_extra_detail to get marketplace_order_id
//     const { data: orderExtraDetails } = await query.graph({
//       entity: 'order_extra_detail',
//       fields: ['marketplace_order_id', 'stock_location_id'],
//       filters: {
//         order_id: order_id
//       }
//     })

//     if (!orderExtraDetails || orderExtraDetails.length === 0) {
//       console.warn(`[Order RTO SQS] No order_extra_detail found for order_id: ${order_id}`)
//       return
//     }

//     const marketplaceOrderId = orderExtraDetails[0].marketplace_order_id
//     const stockLocationId = orderExtraDetails[0].stock_location_id

//     // Query stock_location_section to get partner_wh_code
//     let returnLocationCode = ''
//     if (stockLocationId) {
//       const { data: stockLocationSections } = await query.graph({
//         entity: 'stock_location_section',
//         fields: ['partner_wh_code'],
//         filters: {
//           stock_location_id: stockLocationId
//         }
//       })

//       returnLocationCode = stockLocationSections?.[0]?.partner_wh_code || ''
//     }

//     if (!returnLocationCode) {
//       console.warn(`[Order RTO SQS] No partner_wh_code found for order_id: ${order_id}`)
//       return
//     }

//     // Map line items
//     const lineItems = (order.items || []).map((item: any) => ({
//       lineItemId: item.id,
//       reason: 'Courier return to origin',
//       reasonCode: 'RTO',
//       returnLocationCode: returnLocationCode
//     }))

//     if (lineItems.length === 0) {
//       console.warn(`[Order RTO SQS] No line items found for order_id: ${order_id}`)
//       return
//     }

//     // Prepare SQS message
//     const messageBody = {
//       operation: 'createReturn',
//       returnEvent: 'RETURNTOORIGIN',
//       marketplaceOrderId: marketplaceOrderId,
//       shipmentid: fulfillmentId,
//       sellerId: sellerId,
//       lineItems: lineItems
//     }
//     // Send to SQS using shared utility
//     await sendSQSMessage({
//       message: {
//         body: messageBody
//       },
//       queueUrl: process.env.AWS_ZILO_RETURN_QUEUE_URL
//     })
//   } catch (error) {
//     console.error('[Order RTO SQS] Error processing order_rto event:', error instanceof Error ? error.message : error)
//   }
// }

// export const config: SubscriberConfig = {
//   event: 'order_rto',
//   context: {
//     subscriberId: 'order-rto-sqs-handler'
//   }
// }

