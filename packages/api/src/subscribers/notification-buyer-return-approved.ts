import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'

export default async function orderCreatedHandler({
  event,
  container
}: SubscriberArgs<{ order_id: string; product_name?: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moEngageService = createMoEngageNotificationService(container)
  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: [
      'id',
      'items.title',
      'customer.first_name',
      'customer.last_name',
      'customer.phone',
      'customer.email',
      'order_set.ui_order_set_id'
    ],
    filters: {
      id: event.data.order_id
    }
  })

  if (!order) {
    return
  }

  const orderSetId = order.order_set?.ui_order_set_id || ''
  const customerName = order.customer?.first_name || 'Customer'
  const productNameSource = event.data.product_name || ''
  const productName =
    productNameSource && productNameSource.length > 20
      ? `${productNameSource.slice(0, 20)}...`
      : productNameSource


  if (order.customer?.phone && order.customer?.email) {

    console.log('Sending email notification for order return approved')
    moEngageService.sendNotifications({
      alertName: MoEngageAlertName.ORDER_RETURN_APPROVED_EMAIL,
      recipient: {
        phone: order.customer?.phone,
        email: order.customer?.email,
        deviceTokenId: ''
      },
      data: {
        customer_name: customerName,
        order_id: orderSetId,
        product_name: productName
      }
    })
    console.log('Email notification sent for order return approved')
    moEngageService.sendNotifications({
      alertName: MoEngageAlertName.ORDER_RETURN_APPROVED,
      recipient: {
        phone: order.customer?.phone,
        email: order.customer?.email,
        deviceTokenId: order.customer?.phone
      },
      data: {
        customer_name: customerName,
        order_id: orderSetId,
        product_name: productName
      }
    })
  }




}
// dummy comment
export const config: SubscriberConfig = {
  event: 'return_requested',
  context: {
    subscriberId: 'notification-buyer-return-approved-handler'
  }
}
