import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'

export default async function paymentFailedHandler({
  event,
  container
}: SubscriberArgs<{ payment_collection_id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moEngageService = createMoEngageNotificationService(container)
  
  const paymentCollectionId = event.data.payment_collection_id

  if (!paymentCollectionId) {
    return
  }

  // Query order_set directly by payment_collection_id
  const { data: orderSets } = await query.graph({
    entity: 'order_set',
    fields: [
      'ui_order_set_id',
      'orders.customer.*'
    ],
    filters: {
      payment_collection_id: paymentCollectionId
    }
  })

  const orderSet = orderSets?.[0]

  if (!orderSet || !orderSet.orders || !orderSet.orders.length) {
    return
  }

  const order = orderSet.orders[0]
  const customer = order?.customer

  if (!customer) {
    return
  }

  if(customer.phone) {
    moEngageService.sendNotifications({
      alertName: MoEngageAlertName.PAYMENT_FAILED,
      recipient: {
        phone: customer.phone,
        deviceTokenId: customer.phone
      },
      data: {
        order_id: orderSet.ui_order_set_id,
        customer_name: customer.first_name || 'Customer'
      }
    })
  }

  // Send notification with ui_order_set_id and customer_name

}

export const config: SubscriberConfig = {
  event: 'payment_failed',
  context: {
    subscriberId: 'notification-payment-failed-handler'
  }
}

