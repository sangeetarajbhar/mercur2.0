import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getFormattedOrderSetListWorkflow } from '../../workflows/order-set/workflows'
import {
  buildOrderSetAnalyticsPayload,
  ORDER_SET_ANALYTICS_QUERY_FIELDS,
  ORDER_SET_ANALYTICS_WORKFLOW_FIELDS,
  sendOrderSetAnalytics,
  type OrderSetAnalyticsData
} from '../utils/order-set-analytics'

export default async function analyticsOrderPrepaidSubscriber({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const orderSetId = event.data?.id
  if (!orderSetId) {
    console.warn('[analytics-order-prepaid] Missing id in event data')
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
      console.warn('[analytics-order-prepaid] Order set or orders not found:', orderSetId)
      return
    }

    const primaryOrder = orderSet.orders[0]
    const customer = primaryOrder?.customer
    if (!customer) {
      console.warn('[analytics-order-prepaid] No customer on order set:', orderSetId)
      return
    }

    const paymentCollection = (orderSet as { payment_collection?: { status?: string } })?.payment_collection
    const financialStatus = paymentCollection?.status ?? 'paid'

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

    const analyticsData: OrderSetAnalyticsData = {
      orderSet: orderSet as OrderSetAnalyticsData['orderSet'],
      primaryOrder,
      customer,
      deliveryDetailRecord: deliveryDetailRecord ?? null,
      extraChargesData,
      formattedOrderSet,
      cartData,
      options: {
        eventName: 'Order Completed',
        paymentMethod: 'online',
        financialStatus
      }
    }

    const payload = buildOrderSetAnalyticsPayload(analyticsData)
    // console.log('prepaid order placed payload',payload)
    await sendOrderSetAnalytics(payload, 'analytics-order-prepaid')
  } catch (error) {
    console.error('Error in analyticsOrderPrepaidSubscriber:', error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: 'payment.success',
  context: {
    subscriberId: 'analytics-order-prepaid-handler'
  }
}
