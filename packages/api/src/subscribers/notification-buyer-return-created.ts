import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  // OrderWorkflowEvents
  CustomerWorkflowEvents
} from '@medusajs/framework/utils'
import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'

export default async function orderCreatedHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moEngageService = createMoEngageNotificationService(container)

  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: [
      '*',
      'customer.*',
      'items.*',
      'shipping_address.*',
      'shipping_methods.*',
      'summary.*',
    ],
    filters: {
      id: event.data.id
    }
  })

  if (!order) {
    return
  }

  if (order.customer?.phone && order.customer?.email) {
    // Send MoEngage notifications (SMS, WhatsApp, Email, Push) based on configuration
    moEngageService.sendNotifications({
      alertName: MoEngageAlertName.ORDER_RETURN_CREATED,
      recipient: {
        phone: order.customer?.phone,
        email: order.customer?.email,
        deviceTokenId: order.customer?.phone
      },
      data: {
        customer_name: order.customer?.first_name || '',
        order_id: order.id,
      }
    })
  }
}

export const config: SubscriberConfig = {
  // event: OrderWorkflowEvents.PLACED, 
  event: CustomerWorkflowEvents.UPDATED,
  context: {
    subscriberId: 'notification-buyer-return-created-handler'
  }
}
