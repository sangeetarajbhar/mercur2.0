import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'


import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'
import { SplitOrderPaymentWorkflowEvents } from '../types/split-order-payment';


export default async function orderCreatedHandler({
  event,
  container
}: SubscriberArgs<{ id: string; split_order_payment_id: string; amount: number }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moEngageService = createMoEngageNotificationService(container)

  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: [
      'customer.first_name',
      'customer.email',
      'customer.phone',
      'order_set.ui_order_set_id',
      'items.variant.product.title'
    ],
    filters: {
      id: event.data.id
    }
  })

  if (!order) {
    return
  }


  const customerName = order.customer?.first_name || ''
  const orderSetId = order.order_set?.ui_order_set_id || ''
  const fullTitle =
    Array.isArray(order.items) && order.items.length > 0
      ? (order.items[0]?.variant?.product?.title || '')
      : ''
  const productTitle =
    fullTitle && fullTitle.length > 20 ? `${fullTitle.slice(0, 20)}...` : fullTitle

  if (order.customer?.phone && order.customer?.email) {
    moEngageService.sendNotifications({
      alertName: MoEngageAlertName.ORDER_REFUND_INITIATED_EMAIL,
      recipient: {
        phone: order.customer?.phone,
        email: order.customer?.email,
        deviceTokenId: ''
      },
      data: {
        customer_name: customerName,
        order_id: orderSetId,
        amount: event.data.amount,
        product_name: productTitle,
      }
    })

    // Send MoEngage notifications (SMS, WhatsApp, Email, Push) based on configuration

    moEngageService.sendNotifications({
      alertName: MoEngageAlertName.ORDER_REFUND_INITIATED_EMAIL,
      recipient: {
        phone: order.customer?.phone,
        email: order.customer?.email,
        deviceTokenId: ''
      },
      data: {
        customer_name: customerName,
        order_id: orderSetId,
        amount: event?.data?.amount,
        product_name: productTitle,
      }
    })

    

    moEngageService.sendNotifications({
      alertName: MoEngageAlertName.ORDER_REFUND_INITIATED,
      recipient: {
        phone: order.customer?.phone,
        email: order.customer?.email,
        deviceTokenId: order.customer?.phone
      },
      data: {
        customer_name: customerName,
        order_id: orderSetId,
        amount: event?.data?.amount,
        item_name: productTitle,
      }
    })
  }



  


}
// dummy comment
export const config: SubscriberConfig = {
  event: SplitOrderPaymentWorkflowEvents.REFUND_COMPLETED,
  context: {
    subscriberId: 'notification-buyer-refund-initiated-handler'
  }
}
