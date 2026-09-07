import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'

export default async function returnCancelledNotificationHandler({
  event,
  container
}: SubscriberArgs<{ return_id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moEngageService = createMoEngageNotificationService(container)
  const { return_id } = event.data

  if (!return_id) {
    console.warn('[Return Cancelled Notification] Missing return_id in event data')
    return
  }

  try {
    // Query the return to get order_id
    const { data: returns } = await query.graph({
      entity: 'return',
      fields: [
        'id',
        'order_id',
        'items.item_id'
      ],
      filters: {
        id: return_id
      }
    })

    if (!returns || returns.length === 0) {
      console.warn(`[Return Cancelled Notification] No return found for return_id: ${return_id}`)
      return
    }

    const returnRecord = returns[0]
    const orderId = returnRecord.order_id

    if (!orderId) {
      console.warn(`[Return Cancelled Notification] No order_id found for return_id: ${return_id}`)
      return
    }

    // Get the return item's item_id (there's only one item per return)
    const returnItemId = returnRecord.items?.[0]?.item_id

    if (!returnItemId) {
      console.warn(`[Return Cancelled Notification] No item found in return for return_id: ${return_id}`)
      return
    }

    // Query order to get customer and items with title
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'customer.first_name',
        'customer.email',
        'customer.phone',
        'items.id',
        'items.title'
      ],
      filters: {
        id: orderId
      }
    })

    if (!orders || orders.length === 0) {
      console.warn(`[Return Cancelled Notification] No order found for order_id: ${orderId}`)
      return
    }

    const order = orders[0]
    const customer = order.customer

    if (!customer) {
      console.warn(`[Return Cancelled Notification] No customer found for order_id: ${orderId}`)
      return
    }

    // Get customer name
    const customerName = customer.first_name || 'Customer'

    // Get product name from the return item's title (there's only one item per return)
    const matchingItem = order.items?.find((item: any) => item.id === returnItemId)
    const fullProductName = matchingItem?.title || 'NA'
    const productName = fullProductName && fullProductName.length > 15 
      ? `${fullProductName.slice(0, 15)}...` 
      : fullProductName
    // Send MoEngage notifications

    if(customer.phone && customer.email) {
      moEngageService.sendNotifications({
        alertName: MoEngageAlertName.ORDER_RETURN_CANCELLED,
        recipient: {
          phone: customer.phone,
          email: customer.email, 
          deviceTokenId: customer.phone
        },
        data: {
          customer_name: customerName,
          product_name: productName
        }
      })
    }
   
   

    // console.log(`[Return Cancelled Notification] Successfully sent notification for return_id: ${return_id}`)
  } catch (error) {
    console.error('[Return Cancelled Notification] Error processing return_cancelled event:', error instanceof Error ? error.message : error)
  }
}

export const config: SubscriberConfig = {
  event: 'return_cancelled',
  context: {
    subscriberId: 'notification-buyer-return-cancel-handler'
  }
}

