// import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
// import {
//   ContainerRegistrationKeys,
//   // OrderWorkflowEvents
//   CustomerWorkflowEvents
// } from '@medusajs/framework/utils'
// import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
// import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'

// export default async function orderCreatedHandler({
//   event,
//   container
// }: SubscriberArgs<{ id: string }>) {
//   const query = container.resolve(ContainerRegistrationKeys.QUERY)
//   const moEngageService = createMoEngageNotificationService(container)
  
//   const {
//     data: [order]
//   } = await query.graph({
//     entity: 'order',
//     fields: [
//       'id',
//       'display_id',
//       'email',
//       // Customer details
//       'customer.first_name',
//       'customer.last_name',
//       'customer.phone', 
//       'customer.email',
//       'customer.device_token_id',
//       // All order items for reference
//       'items.*',
//       'items.variant.product.title',
//       // Returns with refund details
//       'returns.*',
//       'returns.refund_amount',
//       'returns.items.*',
//       'returns.items.item_id',
//       'returns.items.quantity',
//       // Payment refunds
//       'payment_collections.payments.refunds.*',
//       'split_order_payment.refunded_amount'
//     ],
//     filters: {
//       id: event.data.id
//     }
//   })
  
//   if (!order) {
//     return
//   }

//   // Get refund amount from returns or split payment
//   const refundAmount = order.returns?.[0]?.refund_amount || order.split_order_payment?.refunded_amount || 0
  
//   // Get product names ONLY for items that were refunded/returned
//   const getRefundedProductNames = (order) => {
//     if (!order.returns || !order.returns.length) return []
    
//     const refundedProducts: { name: string; quantity: number }[] = []
    
//     // Loop through each return (refund)
//     order.returns.forEach(returnItem => {
//       if (returnItem.items) {
//         // Loop through each item in this return
//         returnItem.items.forEach(returnedItem => {
//           // Find the original order item that was returned
//           const originalOrderItem = order.items?.find(item => item.id === returnedItem.item_id)
//           if (originalOrderItem) {
//             refundedProducts.push({
//               name: originalOrderItem.variant?.product?.title || originalOrderItem.title,
//               quantity: returnedItem.quantity
//             })
//           }
//         })
//       }
//     })
    
//     return refundedProducts
//   }

//   const refundedProducts = getRefundedProductNames(order)
//   const refundedProductNames = refundedProducts.map(p => p.name).join(', ') || 'N/A'

//   // Send MoEngage notifications (SMS, WhatsApp, Email, Push) based on configuration
//   moEngageService.sendNotifications({
//     alertName: MoEngageAlertName.ORDER_REFUND_DONE,
//     recipient: {
//       phone: order.customer?.phone,
//       email: order.customer?.email,
//       deviceTokenId: order.customer?.device_token_id
//     },
//     data: {
//       customer_name: order.customer?.first_name || '',
//       order_id: order.id,
//       refund_amount: refundAmount,
//       product_name: refundedProductNames,
//     }
//   })


// }

// export const config: SubscriberConfig = {
//   // event: OrderWorkflowEvents.PLACED,
//   event: CustomerWorkflowEvents.UPDATED,
//   context: {
//     subscriberId: 'notification-buyer-refund-done-handler'
//   }
// }
