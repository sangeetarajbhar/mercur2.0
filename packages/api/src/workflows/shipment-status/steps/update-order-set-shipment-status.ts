import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'

import orderSetOrder from '../../../links/order-set-order'
import { OrderLineItemStatus, ShipmentStatus } from '../../../utils/constants/order-statuses'

type UpdateOrderSetShipmentStatusInput = {
  orderSetId: string
  status: string
}

type UpdateOrderSetShipmentStatusResult = {
  orderIds: string[]
  lineItemIds: string[]
  eventName?: string
}

// Allowed statuses for line items when transitioning to DELIVERED
const ALLOWED_ITEM_STATUSES_FOR_DELIVERY = [
  OrderLineItemStatus.SHIPPED,
  OrderLineItemStatus.CANCELLED,
  OrderLineItemStatus.REJECTED
]

export const updateOrderSetShipmentStatusStep = createStep(
  'update-order-set-shipment-status',
  async (input: UpdateOrderSetShipmentStatusInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const eventBus = container.resolve(Modules.EVENT_BUS)

    // Get all orders linked to this order set
    const { data: orderLinks } = await query.graph({
      entity: orderSetOrder.entryPoint,
      fields: ['order_id'],
      filters: {
        order_set_id: input.orderSetId
      }
    })

    const allOrderIds = (orderLinks || [])
      .map((link: any) => link.order_id)
      .filter(Boolean)

    if (!allOrderIds.length) {
      return new StepResponse<UpdateOrderSetShipmentStatusResult>({
        orderIds: [],
        lineItemIds: []
      })
    }

    // Get all orders with their items and line item extensions in a single query
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: ['id', 'status', 'items.id', 'items.order_line_item_extension.order_line_item_id', 'items.order_line_item_extension.status'],
      filters: {
        id: allOrderIds
      }
    })

    // Extract all line items with their statuses
    const allLineItems: { lineItemId: string; status: string }[] = []
    for (const order of orders || []) {
      for (const item of (order as any).items || []) {
        const extension = item.order_line_item_extension
        if (extension?.order_line_item_id) {
          allLineItems.push({
            lineItemId: extension.order_line_item_id,
            status: extension.status
          })
        }
      }
    }

    const allLineItemIds = allLineItems.map(item => item.lineItemId)

    // For DELIVERED status, apply validation and filtering
    if (input.status === ShipmentStatus.DELIVERED) {
      // Validate: all items must be in SHIPPED, CANCELLED, or REJECTED status
      const invalidItems = allLineItems.filter(
        item => !ALLOWED_ITEM_STATUSES_FOR_DELIVERY.includes(item.status as OrderLineItemStatus)
      )

      if (invalidItems.length > 0) {
        const invalidStatuses = [...new Set(invalidItems.map(item => item.status))]
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Cannot mark as DELIVERED. Some items have invalid status: ${invalidStatuses.join(', ')}. All items must be in SHIPPED, CANCELLED, or REJECTED status.`
        )
      }

      // Filter: only update line items that are in SHIPPED status
      const shippedLineItemIds = allLineItems
        .filter(item => item.status === OrderLineItemStatus.SHIPPED)
        .map(item => item.lineItemId)

      // Filter: only update orders that are in SHIPPED status
      const shippedOrderIds = (orders || [])
        .filter((order: any) => order.status === ShipmentStatus.SHIPPED)
        .map((order: any) => order.id)

      // Update only SHIPPED orders
      if (shippedOrderIds.length > 0) {
        await knex('order')
          .whereIn('id', shippedOrderIds)
          .update({ status: input.status })
      }

      // Update only SHIPPED line items
      if (shippedLineItemIds.length > 0) {
        await knex('order_line_item_extension')
          .whereIn('order_line_item_id', shippedLineItemIds)
          .update({ status: input.status })
      }

      await eventBus.emit({
        name: 'order_set_delivered',
        data: {
          order_set_id: input.orderSetId
        }
      })

      return new StepResponse<UpdateOrderSetShipmentStatusResult>({
        orderIds: shippedOrderIds,
        lineItemIds: shippedLineItemIds,
        eventName: 'order_set_delivered'
      })
    }

    // For SHIPPED status, only update items in PACKED status (exclude CANCELLED, REJECTED)
    if (input.status === ShipmentStatus.SHIPPED) {
      // Filter: only update line items that are in PACKED status
      const packedLineItemIds = allLineItems
        .filter(item => item.status === OrderLineItemStatus.PACKED)
        .map(item => item.lineItemId)

      // Filter: only update orders that are in PACKED status
      const packedOrderIds = (orders || [])
        .filter((order: any) => order.status === ShipmentStatus.PACKED)
        .map((order: any) => order.id)

      // Update only PACKED orders
      if (packedOrderIds.length > 0) {
        await knex('order')
          .whereIn('id', packedOrderIds)
          .update({ status: input.status })
      }

      // Update only PACKED line items
      if (packedLineItemIds.length > 0) {
        await knex('order_line_item_extension')
          .whereIn('order_line_item_id', packedLineItemIds)
          .update({ status: input.status })
      }

      await eventBus.emit({
        name: 'order_set_shipped',
        data: {
          order_set_id: input.orderSetId
        }
      })

      return new StepResponse<UpdateOrderSetShipmentStatusResult>({
        orderIds: packedOrderIds,
        lineItemIds: packedLineItemIds,
        eventName: 'order_set_shipped'
      })
    }

    // For other statuses, use existing behavior
    await knex('order').whereIn('id', allOrderIds).update({ status: input.status })

    if (allLineItemIds.length) {
      await knex('order_line_item_extension')
        .whereIn('order_line_item_id', allLineItemIds)
        .update({ status: input.status })
    }

    return new StepResponse<UpdateOrderSetShipmentStatusResult>({
      orderIds: allOrderIds,
      lineItemIds: allLineItemIds
    })
  },
  async () => {
    return
  }
)
