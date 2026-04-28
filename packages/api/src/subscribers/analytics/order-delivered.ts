import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getFormattedOrderSetListWorkflow } from '../../workflows/order-set/workflows'
import {
  buildOrderDeliveredAnalyticsPayload,
  ORDER_SET_ANALYTICS_QUERY_FIELDS,
  ORDER_SET_ANALYTICS_WORKFLOW_FIELDS,
  sendOrderSetAnalytics,
  type OrderSetAnalyticsData
} from '../utils/order-set-analytics'

export default async function analyticsOrderDeliveredSubscriber({
  event,
  container
}: SubscriberArgs<{ order_set_id: string }>) {
  const orderSetId = event.data?.order_set_id
  if (!orderSetId) {
    console.warn('[analytics-order-delivered] Missing order_set_id in event data')
    return
  }

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [orderSet]
    } = await query.graph({
      entity: 'order_set',
      fields: [...ORDER_SET_ANALYTICS_QUERY_FIELDS],
      filters: { id: orderSetId }
    }) as any

    if (!orderSet || !orderSet.orders?.length) {
      console.warn('[analytics-order-delivered] Order set or orders not found:', orderSetId)
      return
    }

    const primaryOrder = orderSet.orders[0]
    const customer = primaryOrder?.customer
    if (!customer) {
      console.warn('[analytics-order-delivered] No customer on order set:', orderSetId)
      return
    }

    const {
      data: [deliveryDetailRecord]
    } = await query.graph({
      entity: 'order_delivery_detail',
      fields: ['delivery_type', 'delivery_date', 'start_time', 'end_time', 'slot_id'],
      filters: { order_set_id: orderSet.id }
    })

    let extraChargesData: Array<{ name: string; fee_amount: number }> = []
    if (orderSet.cart_id) {
      const { data: charges } = await query.graph({
        entity: 'cart_order_extra_charge',
        fields: ['name', 'fee_amount'],
        filters: { cart_id: orderSet.cart_id }
      })
      extraChargesData = (charges ?? []) as Array<{ name: string; fee_amount: number }>
    }

    let formattedOrderSet: OrderSetAnalyticsData['formattedOrderSet'] = null
    try {
      const { result: formattedOrderSetResult } =
        await getFormattedOrderSetListWorkflow(container).run({
          input: {
            filters: { id: orderSet.id },
            fields: [...ORDER_SET_ANALYTICS_WORKFLOW_FIELDS]
          }
        })
      formattedOrderSet = (formattedOrderSetResult?.data?.[0] ?? null) as OrderSetAnalyticsData['formattedOrderSet']
    } catch (error) {
      console.warn('Failed to fetch formatted order set from workflow:', error)
    }

    let cartData: OrderSetAnalyticsData['cartData'] = null
    if (orderSet.cart_id) {
      const {
        data: [cart]
      } = await query.graph({
        entity: 'cart',
        fields: ['subtotal', 'total', 'promotions.*', 'billing_address.*', 'shipping_address.*'],
        filters: { id: orderSet.cart_id }
      })
      cartData = cart as OrderSetAnalyticsData['cartData']
    }

    // options (paymentMethod, financialStatus) are unused by buildOrderDeliveredAnalyticsPayload
    const analyticsData: OrderSetAnalyticsData = {
      orderSet: orderSet as OrderSetAnalyticsData['orderSet'],
      primaryOrder,
      customer,
      deliveryDetailRecord: deliveryDetailRecord ?? null,
      extraChargesData,
      formattedOrderSet,
      cartData,
      options: {
        eventName: 'Order Delivered',
        paymentMethod: '',
        financialStatus: ''
      }
    }

    const payload = buildOrderDeliveredAnalyticsPayload(analyticsData)
    // console.log('order-delivered payload',payload)
    await sendOrderSetAnalytics(payload, 'analytics-order-delivered')
  } catch (error) {
    console.error('Error in analyticsOrderDeliveredSubscriber:', error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: 'order_set_delivered',
  context: {
    subscriberId: 'analytics-order-delivered-handler'
  }
}
