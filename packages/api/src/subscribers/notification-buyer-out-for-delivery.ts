import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'
import { ORDER_TRACKING_URL } from './utils/constants'

export default async function orderSetShippedHandler({
  event,
  container
}: SubscriberArgs<{ order_set_id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moEngageService = createMoEngageNotificationService(container)

  const { data } = await query.graph({
    entity: 'order_set',
    fields: [
      'id',
      'ui_order_set_id',
      'orders.id',
      'orders.customer.*'
    ],
    filters: {
      id: event.data.order_set_id
    }
  })

  const orderSet = (data as any[])?.[0]

  if (!orderSet || !orderSet.orders || !orderSet.orders.length) {
    return
  }

  const order = orderSet.orders?.[0]
  if (!order?.customer) {
    return
  }
  moEngageService.sendNotifications({
    alertName: MoEngageAlertName.ORDER_OUT_FOR_DELIVERY,
    recipient: {
      phone: order?.customer?.phone,
      email: order?.customer?.email,
      deviceTokenId: `+91${order?.customer?.phone}`,
    },
    data: {
      customer_name: order?.customer?.first_name || 'Customer',
      order_id: orderSet.ui_order_set_id,
      tracking_url:`${ORDER_TRACKING_URL}/orders/${orderSet.ui_order_set_id}/status`
    }
  })
}

// dummy comment
export const config: SubscriberConfig = {
  event: 'order_set_shipped',
  context: {
    subscriberId: 'notification-buyer-out-for-delivery-handler'
  }
}
