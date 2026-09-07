// import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
// import {
//   ContainerRegistrationKeys,
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
//       '*',
//       'customer.*',
//     ],
//     filters: {
//       id: event.data.id
//     }
//   })
  
//   if (!order) {
//     return
//   }

//   // Send MoEngage notifications (SMS, WhatsApp, Email, Push) based on configuration
//   moEngageService.sendNotifications({
//     alertName: MoEngageAlertName.ORDER_DELIVERY_FAILED,
//     recipient: {
//       phone: order.customer?.phone,
//       email: order.customer?.email,
//       deviceTokenId: order.customer?.device_token_id
//     },
//     data: {
//       order_id: order.id,
//     }
//   })


// }

// export const config: SubscriberConfig = {
//   // event: OrderWorkflowEvents.PLACED,
//   event: CustomerWorkflowEvents.UPDATED,
//   context: {
//     subscriberId: 'notification-buyer-delivery-failed-handler'
//   }
// }
