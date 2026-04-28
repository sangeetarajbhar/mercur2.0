import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'

export default async function returnRiderOutForPickupNotificationHandler({
  event,
  container,
}: SubscriberArgs<{ return_id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const moEngageService = createMoEngageNotificationService(container)
  const { return_id } = event.data


  if (!return_id) {
    console.warn(
      '[Return rider out for pickup] Missing return_id in event data'
    )
    return
  }

  try {
    const { data: returns } = await query.graph({
      entity: 'return',
      fields: ['id', 'order_id', 'items.item_id'],
      filters: { id: return_id },
    })

    if (!returns?.length) {
      console.warn(
        `[Return rider out for pickup] No return found for return_id: ${return_id}`
      )
      return
    }

    const returnRecord = returns[0]
    const orderId = returnRecord.order_id

    if (!orderId) {
      console.warn(
        `[Return rider out for pickup] No order_id for return_id: ${return_id}`
      )
      return
    }

    const returnItemId = returnRecord.items?.[0]?.item_id

    if (!returnItemId) {
      console.warn(
        `[Return rider out for pickup] No return line item for return_id: ${return_id}`
      )
      return
    }

    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'customer.first_name',
        'customer.email',
        'customer.phone',
        'order_set.ui_order_set_id',
        'items.id',
        'items.title',
      ],
      filters: { id: orderId },
    })

    if (!orders?.length) {
      console.warn(
        `[Return rider out for pickup] No order found for order_id: ${orderId}`
      )
      return
    }

    const order = orders[0]
    const customer = order.customer

    if (!customer) {
      console.warn(
        `[Return rider out for pickup] No customer for order_id: ${orderId}`
      )
      return
    }

    if (!customer.phone) {
      console.warn(
        `[Return rider out for pickup] No customer phone; skipping MoEngage for return_id: ${return_id}`
      )
      return
    }

    const customerName = customer.first_name || 'Customer'
    const matchingItem = order.items?.find((item: any) => item.id === returnItemId)
    const fullProductName = matchingItem?.title || 'NA'
    const productName =
      fullProductName && fullProductName.length > 20
        ? `${fullProductName.slice(0, 20)}...`
        : fullProductName

    const orderSetId = order.order_set?.ui_order_set_id || ''

    const templateData = {
      customer_name: customerName,
      product_name: productName,
      order_id: orderSetId,
    }
    const phoneStr = String(customer.phone)
    const phoneLast4 =
      phoneStr.length >= 4 ? phoneStr.slice(-4) : '****'
    // console.log(`templateData: ${JSON.stringify(templateData)}`)


    if(customer.email) {
      await moEngageService.sendNotifications({
        alertName: MoEngageAlertName.RETURN_RIDER_OUT_FOR_PICKUP,
        recipient: {
          phone: customer.phone,
          email: customer.email,
          deviceTokenId: customer.phone,
        },
        data: templateData,
      })
    }
    

  } catch (error) {
    console.error(
      '[Return rider out for pickup] Error:',
      error instanceof Error ? error.message : error
    )
  }
}

export const config: SubscriberConfig = {
  event: 'return_rider_out_for_pickup',
  context: {
    subscriberId: 'notification-buyer-return-rider-out-for-pickup-handler',
  },
}
