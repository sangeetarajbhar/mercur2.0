import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'
import { computeOrderSetStatus } from '../../order-set/utils/compute-order-set-status'

type UpdateOrderStatusInput = {
  orderIds: string[]
}

type OrderStatusUpdate = {
  orderId: string
  status: OrderLineItemStatus
  previousStatus: string
}

const ORDER_ENTITY = 'order'
const ORDER_ITEM_ENTITY = 'order_item'
const LINE_ITEM_EXTENSION_ENTITY = 'order_line_item_extension'

const executeOrderStatusUpdate = async (
  knex: any,
  status: string,
  orderId: string
) => {
  if (!knex || typeof knex !== 'function') {
    throw new Error('Database connection unavailable while updating order status')
  }

  await knex('order').where({ id: orderId }).update({ status })
}

export const updateOrderStatusStep = createStep(
  'update-order-status',
  async (input: UpdateOrderStatusInput, { container }) => {
    const orderIds = Array.from(new Set(input.orderIds ?? [])).filter(Boolean)

    if (!orderIds.length) {
      return new StepResponse<OrderStatusUpdate[], OrderStatusUpdate[]>([], [])
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: orders } = await query.graph({
      entity: ORDER_ENTITY,
      fields: ['id', 'status'],
      filters: {
        id: orderIds
      }
    })

    if (!orders?.length) {
      return new StepResponse<OrderStatusUpdate[], OrderStatusUpdate[]>([], [])
    }

    const currentStatusMap = new Map<string, string>()
    for (const order of orders) {
      if (order?.id) {
        currentStatusMap.set(order?.id, order.status)
      }
    }

    const { data: orderItems} = await query.graph({
      entity: ORDER_ITEM_ENTITY,
      fields: ['item_id', 'order_id'],
      filters: {
        order_id: orderIds 
      } as any
    })

    if (!orderItems?.length) {
      return new StepResponse<OrderStatusUpdate[], OrderStatusUpdate[]>([], [])
    }

    const orderIdByItemId = new Map<string, string>()
    const orderItemIds = new Set<string>()

    for (const item of orderItems as any)  {
      if (item?.item_id && item?.order_id) {
        orderIdByItemId.set(item?.item_id, item?.order_id)
        orderItemIds.add(item.item_id)
      }
    }

    if (!orderItemIds.size) {
      return new StepResponse<OrderStatusUpdate[], OrderStatusUpdate[]>([], [])
    }

    const { data: lineItemExtensions } = await query.graph({
      entity: LINE_ITEM_EXTENSION_ENTITY,
      fields: ['order_line_item_id', 'status'],
      filters: {
        order_line_item_id: Array.from(orderItemIds)
      }
    })

    if (!lineItemExtensions?.length) {
      return new StepResponse<OrderStatusUpdate[], OrderStatusUpdate[]>([], [])
    }

    const statusesByOrderId = new Map<string, OrderLineItemStatus[]>()

    for (const extension of lineItemExtensions) {
      const orderId = orderIdByItemId.get(extension?.order_line_item_id)
      if (!orderId) {
        continue
      }

      const list = statusesByOrderId.get(orderId) ?? []
      if (extension?.status) {
        list.push(extension.status as OrderLineItemStatus)
        statusesByOrderId.set(orderId, list)
      }
    }

    if (!statusesByOrderId.size) {
      return new StepResponse<OrderStatusUpdate[], OrderStatusUpdate[]>([], [])
    }

    const updates: OrderStatusUpdate[] = []

    for (const [orderId, statuses] of statusesByOrderId.entries()) {
      const nextStatus = computeOrderSetStatus(statuses)

      if (nextStatus === null) {
        continue
      }

      const currentStatus = currentStatusMap.get(orderId)
      if (!currentStatus || currentStatus === nextStatus) {
        continue
      }

      const normalizedCurrent = typeof currentStatus === 'string'
        ? currentStatus.toUpperCase()
        : currentStatus

      if (
        normalizedCurrent === OrderLineItemStatus.NEW &&
        nextStatus === OrderLineItemStatus.ACCEPTED
      ) {
        continue
      }

      updates.push({
        orderId,
        status: nextStatus,
        previousStatus: currentStatus
      })
    }

    if (!updates.length) {
      return new StepResponse<OrderStatusUpdate[], OrderStatusUpdate[]>([], [])
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

    for (const update of updates) {
      await executeOrderStatusUpdate(knex, update.status, update.orderId)
    }

    return new StepResponse<OrderStatusUpdate[], OrderStatusUpdate[]>(updates, updates)
  },
  async (compensationData, { container }) => {
    if (!compensationData?.length) {
      return
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

    for (const entry of compensationData) {
      if (!entry?.orderId || typeof entry.previousStatus !== 'string') {
        continue
      }

      await executeOrderStatusUpdate(knex, entry.previousStatus, entry.orderId)
    }
  }
)


