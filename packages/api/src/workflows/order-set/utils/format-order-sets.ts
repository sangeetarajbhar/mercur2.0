import {
  FulfillmentStatus,
  OrderDTO,
  OrderDetailDTO,
  OrderStatus,
  PaymentCollectionStatus
} from '@medusajs/framework/types'
import { BigNumber, MathBN } from '@medusajs/framework/utils'

import {
  FormattedOrderGroupDTO,
  OrderGroupDTO,
  OrderGroupWithOrdersDTO
} from '../../../modules/order-group/types/common'

import { getLastFulfillmentStatus } from '../../order/utils/aggregate-status'

export const formatOrderSets = (
  orderGroupsWithOrders: OrderGroupWithOrdersDTO[]
): FormattedOrderGroupDTO[] => {
  // console.log('[formatOrderSets] Input order sets:', JSON.stringify(orderSetsWithOrders.map(os => ({
  //   id: os.id,
  //   status: (os as any).status,
  //   hasStatus: 'status' in os
  // })), null, 2))

  return  orderGroupsWithOrders.map((orderGroup: OrderGroupWithOrdersDTO): FormattedOrderGroupDTO => {
    const taxTotal = orderGroup.orders.reduce(
      (acc, item) => MathBN.add(acc, item.tax_total),
      MathBN.convert(0)
    )

    const shippingTaxTotal = orderGroup.orders.reduce(
      (acc, order) => MathBN.add(acc, order.shipping_tax_total!),
      MathBN.convert(0)
    )

    const shippingTotal = orderGroup.orders.reduce(
      (acc, order) => MathBN.add(acc, order.shipping_total!),
      MathBN.convert(0)
    )

    // Sum all order totals (without extra charges, as they're at order Group level)
    const ordersTotal = orderGroup.orders.reduce(
      (acc, order) => MathBN.add(acc, order.total),
      MathBN.convert(0)
    )

    // Add extra charges to the order Group total (extra charges apply to entire order Group)
    // extra_charge_total is added by enhanceOrderSetsWithExtraChargesStep
    const extraChargeTotal = (orderGroup as any).extra_charge_total || 0
    const total = MathBN.add(ordersTotal, extraChargeTotal)

    const subtotal = MathBN.sub(total, taxTotal)

    // Only call getPaymentStatus if payment_collection exists
    // This prevents errors when payment_collection is not loaded or doesn't exist
    const payment_status = orderGroup.payment_collection
      ? getPaymentStatus(orderGroup)
      : ('not_paid' as PaymentCollectionStatus)

    // Preserve the database status if it exists, otherwise calculate from orders
    const databaseStatus = (orderGroup as any).status
    // const calculatedStatus = getStatus(orderGroup.orders as unknown as OrderDTO[])

    // console.log('[formatOrderSets] Order Group statuses:', {
    //   id: orderGroup.id,
    //   databaseStatus,
    //   calculatedStatus,
    //   willUse: databaseStatus || calculatedStatus
    // })

    // Explicitly preserve metadata and rider_assigned_at fields
    const metadata = (orderGroup as any).metadata
    const rider_assigned_at = (orderGroup as any).rider_assigned_at

    return {
      ...orderGroup,
      ui_order_set_id: (orderGroup as any).ui_order_set_id as string, // Fetched from database
      orders: orderGroup.orders.map((order) => ({
        ...order,
        fulfillment_status: getLastFulfillmentStatus(order as OrderDetailDTO) as FulfillmentStatus
      })),
      status: (databaseStatus || getStatus(orderGroup.orders as unknown as OrderDTO[])) as OrderStatus,
      payment_status,
      fulfillment_status: getFulfillmentStatus(orderGroup.orders as OrderDetailDTO[]),
      tax_total: new BigNumber(taxTotal),
      shipping_tax_total: new BigNumber(shippingTaxTotal),
      shipping_total: new BigNumber(shippingTotal),
      total: new BigNumber(total),
      subtotal: new BigNumber(subtotal),
      // Explicitly preserve metadata and rider_assigned_at
      metadata: metadata as Record<string, unknown> | null | undefined,
      rider_assigned_at: rider_assigned_at as Date | null | undefined
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

const getPaymentStatus = (orderGroup: OrderGroupDTO): PaymentCollectionStatus => {
  if (!orderGroup.payment_collection) {
    // Fallback to a default status if payment_collection is not available
    return 'not_paid' as PaymentCollectionStatus
  }
  return orderGroup.payment_collection.status
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
