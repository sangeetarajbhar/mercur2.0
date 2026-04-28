import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'

export default async function notificationBuyerItemCancelledHandler({
  event,
  container
}: SubscriberArgs<{ order_id: string; line_item_id: string }>) {
  const { order_id, line_item_id } = event.data
  if (!order_id || !line_item_id) {
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moEngageService = createMoEngageNotificationService(container)

  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: [
      'id',
      'order_set.ui_order_set_id',
      'customer.phone',
      'customer.email',
      'customer.first_name',
      'items.id',
      'items.title',
      'items.variant.product.title'
    ],
    filters: {
      id: order_id
    }
  })

  if (!order) {
    return
  }

  const lineItem = (order as any).items?.find((item: any) => item.id === line_item_id)
  let item_name =
    lineItem?.variant?.product?.title || lineItem?.title || 'Item';
  if (item_name.length > 20) {
    item_name = `${item_name.slice(0, 20)}...`
  }

  const orderIdForNotification = (order as any).order_set?.ui_order_set_id
  if (!orderIdForNotification) {
    return
  }

  const customer = (order as any).customer
  if (!customer?.phone && !customer?.email) {
    return
  }

  moEngageService.sendNotifications({
    alertName: MoEngageAlertName.ITEM_CANCELLED,
    recipient: {
      phone: customer?.phone,
      email: customer?.email,
      deviceTokenId: customer?.phone ? `+91${customer.phone}` : ''
    },
    data: {
      item_name,
      order_id: orderIdForNotification
    }
  })
}

export const config: SubscriberConfig = {
  event: 'item.cancelled',
  context: {
    subscriberId: 'notification-buyer-item-cancelled-handler'
  }
}