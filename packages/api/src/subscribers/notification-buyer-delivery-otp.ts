// import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
// import {
//   ContainerRegistrationKeys,
//   OrderWorkflowEvents
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
//     alertName: MoEngageAlertName.ORDER_DELIVERY_OTP,
//     recipient: {
//       phone: order.customer?.phone,
//       email: order.customer?.email,
//       deviceTokenId: order.customer?.device_token_id
//     },
//     data: {
//       // CHANGE this actual otp value received from the event 
//       otp: order.customer?.phone, 
//     }
//   })


// }

// export const config: SubscriberConfig = {
//   event: OrderWorkflowEvents.PLACED,
//   context: {
//     subscriberId: 'notification-buyer-delivery-otp-handler'
//   }
// }
