import {
  OrderDTO,
  OrderDetailDTO,
  OrderStatus,
  PaymentCollectionStatus
} from '@medusajs/framework/types'
import { BigNumber, MathBN } from '@medusajs/framework/utils'

// import {
//   FormattedOrderSetDTO,
//   OrderSetDTO,
//   OrderSetWithOrdersDTO
// } from '@mercurjs/framework'

// import { getLastFulfillmentStatus } from '../../order/utils/aggregate-status'

type FormattedOrderSetDTO = any
type OrderSetDTO = any
type OrderSetWithOrdersDTO = any
const getLastFulfillmentStatus = (_order: OrderDetailDTO) => undefined as any

export const formatOrderSets = (
  orderSetsWithOrders: OrderSetWithOrdersDTO[]
): FormattedOrderSetDTO[] => {
  // console.log('[formatOrderSets] Input order sets:', JSON.stringify(orderSetsWithOrders.map(os => ({
  //   id: os.id,
  //   status: (os as any).status,
  //   hasStatus: 'status' in os
  // })), null, 2))

  return orderSetsWithOrders.map((orderSet) => {
    const taxTotal = orderSet.orders.reduce(
      (acc, item) => MathBN.add(acc, item.tax_total),
      MathBN.convert(0)
    )

    const shippingTaxTotal = orderSet.orders.reduce(
      (acc, order) => MathBN.add(acc, order.shipping_tax_total!),
      MathBN.convert(0)
    )

    const shippingTotal = orderSet.orders.reduce(
      (acc, order) => MathBN.add(acc, order.shipping_total!),
      MathBN.convert(0)
    )

    // Sum all order totals (without extra charges, as they're at order set level)
    const ordersTotal = orderSet.orders.reduce(
      (acc, order) => MathBN.add(acc, order.total),
      MathBN.convert(0)
    )

    // Add extra charges to the order set total (extra charges apply to entire order set)
    // extra_charge_total is added by enhanceOrderSetsWithExtraChargesStep
    const extraChargeTotal = (orderSet as any).extra_charge_total || 0
    const total = MathBN.add(ordersTotal, extraChargeTotal)

    const subtotal = MathBN.sub(total, taxTotal)

    // Only call getPaymentStatus if payment_collection exists
    // This prevents errors when payment_collection is not loaded or doesn't exist
    const payment_status = orderSet.payment_collection
      ? getPaymentStatus(orderSet)
      : ('not_paid' as PaymentCollectionStatus)

    // Preserve the database status if it exists, otherwise calculate from orders
    const databaseStatus = (orderSet as any).status
    // const calculatedStatus = getStatus(orderSet.orders as unknown as OrderDTO[])

    // console.log('[formatOrderSets] Order set statuses:', {
    //   id: orderSet.id,
    //   databaseStatus,
    //   calculatedStatus,
    //   willUse: databaseStatus || calculatedStatus
    // })

    // Explicitly preserve metadata and rider_assigned_at fields
    const metadata = (orderSet as any).metadata
    const rider_assigned_at = (orderSet as any).rider_assigned_at

    return {
      ...orderSet,
      ui_order_set_id: (orderSet as any).ui_order_set_id, // Fetched from database
      orders: orderSet.orders.map((order) => ({
        ...order,
        fulfillment_status: getLastFulfillmentStatus(order as OrderDetailDTO),
        payment_status
      })),
      // status: databaseStatus || calculatedStatus,  // Use database status if available
      status: databaseStatus,
      payment_status,
      fulfillment_status: getFulfillmentStatus(orderSet.orders as OrderDetailDTO[]),
      tax_total: new BigNumber(taxTotal),
      shipping_tax_total: new BigNumber(shippingTaxTotal),
      shipping_total: new BigNumber(shippingTotal),
      total: new BigNumber(total),
      subtotal: new BigNumber(subtotal),
      // Explicitly preserve metadata and rider_assigned_at
      metadata: metadata,
      rider_assigned_at: rider_assigned_at
    }
  })
}

const getStatus = (orders: OrderDTO[]): OrderStatus => {
  const statuses = orders.map((order) => order.status)

  if (statuses.every((status) => status === 'completed')) {
    return 'completed'
  }

  if (statuses.every((status) => status === 'canceled')) {
    return 'canceled'
  }

  if (statuses.some((status) => status === 'requires_action')) {
    return 'requires_action'
  }

  return 'pending'
}

const getPaymentStatus = (orderSet: OrderSetDTO): PaymentCollectionStatus => {
  if (!orderSet.payment_collection) {
    // Fallback to a default status if payment_collection is not available
    return 'not_paid' as PaymentCollectionStatus
  }
  return orderSet.payment_collection.status
}

export const getFulfillmentStatus = (orders: OrderDetailDTO[]) => {
  const statuses = orders.map((order) => order.fulfillment_status)

  if (statuses.every((status) => status === 'canceled')) {
    return 'canceled'
  }

  if (statuses.every((status) => status === 'delivered')) {
    return 'delivered'
  }

  if (statuses.every((status) => status === 'fulfilled')) {
    return 'fulfilled'
  }

  if (statuses.every((status) => status === 'shipped')) {
    return 'shipped'
  }

  if (
    statuses.some(
      (status) => status === 'partially_delivered' || status === 'delivered'
    )
  ) {
    return 'partially_delivered'
  }

  if (
    statuses.some(
      (status) => status === 'partially_shipped' || status === 'shipped'
    )
  ) {
    return 'partially_shipped'
  }

  if (
    statuses.some(
      (status) => status === 'partially_fulfilled' || status === 'fulfilled'
    )
  ) {
    return 'partially_fulfilled'
  }

  return 'not_fulfilled'
}
