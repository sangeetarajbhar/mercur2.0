import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { MARKETPLACE_MODULE } from '../../../modules/marketplace'
import  MarketplaceModuleService  from '../../../modules/marketplace/service'

import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'
import { computeOrderSetStatus } from '../utils/compute-order-set-status'

type UpdateOrderSetStatusInput = {
  orderIds: string[]
}

type OrderSetStatusUpdate = {
  orderSetId: string
  status: OrderLineItemStatus
  previousStatus: OrderLineItemStatus
}

const ORDER_ITEM_ENTITY = 'order_item'
const LINE_ITEM_EXTENSION_ENTITY = 'order_line_item_extension'

export const updateOrderSetStatusStep = createStep(
  'update-order-set-status',
  async (input: UpdateOrderSetStatusInput, { container }) => {
    const orderIds = Array.from(new Set(input.orderIds ?? [])).filter(Boolean)

    if (!orderIds.length) {
      return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>([], [])
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const marketplaceService =
      container.resolve<MarketplaceModuleService>(MARKETPLACE_MODULE)
    const eventBus = container.resolve(Modules.EVENT_BUS)

    // 1. Get orders with their order_set relationships
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: ['id', 'order_set.id', 'order_set.status'],
      filters: {
        id: orderIds
      }
    })

    if (!orders?.length) {
      return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>([], [])
    }

    // 2. Group orders by order_set_id
    const orderSetIdToOrderIds = new Map<string, string[]>()
    const orderSetStatuses = new Map<string, OrderLineItemStatus>()

    // First try to use the relationship from query.graph
    for (const order of orders) {
      const orderSetId = order?.order_set?.id
      if (!orderSetId) {
        continue
      }

      const orderIdsInSet = orderSetIdToOrderIds.get(orderSetId) ?? []
      orderIdsInSet.push(order.id)
      orderSetIdToOrderIds.set(orderSetId, orderIdsInSet)

      orderSetStatuses.set(
        orderSetId,
        (order.order_set?.status as OrderLineItemStatus) ?? OrderLineItemStatus.NEW
      )
    }

    if (!orderSetIdToOrderIds.size) {
      return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>([], [])
    }

    // 3. Get ALL orders that belong to the affected order sets (not just the input orders)
    // Query from order_set entity since Order doesn't support filtering by order_set
    const orderSetIds = Array.from(orderSetIdToOrderIds.keys())
    
    const { data: orderSetsWithOrders } = await query.graph({
      entity: 'order_set',
      fields: ['id', 'orders.id'],
      filters: {
        id: orderSetIds
      }
    })

    if (!orderSetsWithOrders?.length) {
      return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>([], [])
    }

    // Rebuild the map with ALL orders in the order sets
    orderSetIdToOrderIds.clear()
    for (const orderSet of orderSetsWithOrders) {
      if (!orderSet?.id || !orderSet?.orders?.length) {
        continue
      }
      const orderIdsInSet: string[] = []
      for (const order of orderSet.orders) {
        if (order?.id) {
          orderIdsInSet.push(order.id)
        }
      }
      if (orderIdsInSet.length) {
        orderSetIdToOrderIds.set(orderSet.id, orderIdsInSet)
      }
    }

    // Safety check: ensure we have order sets with orders after rebuild
    if (!orderSetIdToOrderIds.size) {
      return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>([], [])
    }

    const allOrderIdsInSets = Array.from(
      new Set(
        Array.from(orderSetIdToOrderIds.values()).flat()
      )
    )

    // Safety check: ensure we have order IDs to query
    if (!allOrderIdsInSets.length) {
      return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>([], [])
    }

    const { data: orderItems } = await query.graph({
      entity: ORDER_ITEM_ENTITY,
      fields: ['item_id', 'order_id'],
      filters: {
        order_id: allOrderIdsInSets
      } as any
    }) as any

    if (!orderItems?.length) {
      return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>([], [])
    }

    const orderItemIds = orderItems.map((item: any) => item.item_id)
    const orderIdByItemId = new Map<string, string>()

    for (const item of orderItems) {
      orderIdByItemId.set(item.item_id, item.order_id)
    }

    // 4. Get line item extensions for all items
    const { data: lineItemExtensions } = await query.graph({
      entity: LINE_ITEM_EXTENSION_ENTITY,
      fields: ['order_line_item_id', 'status'],
      filters: {
        order_line_item_id: orderItemIds
      }
    })

    if (!lineItemExtensions?.length) {
      return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>([], [])
    }

    // 5. Build map of statuses per order_set (aggregating across all orders in the set)
    const statusesByOrderSet = new Map<string, OrderLineItemStatus[]>()

    for (const extension of lineItemExtensions) {
      const orderId = orderIdByItemId.get(extension.order_line_item_id)
      if (!orderId) {
        continue
      }

      // Find which order set this order belongs to
      let targetOrderSetId: string | null = null
      for (const [orderSetId, orderIdsInSet] of orderSetIdToOrderIds.entries()) {
        if (orderIdsInSet.includes(orderId)) {
          targetOrderSetId = orderSetId
          break
        }
      }

      if (!targetOrderSetId) {
        continue
      }

      const statuses = statusesByOrderSet.get(targetOrderSetId) ?? []
      statuses.push(extension.status as OrderLineItemStatus)
      statusesByOrderSet.set(targetOrderSetId, statuses)
    }

    // 6. Compute new status for each order set and collect updates
    const updates: OrderSetStatusUpdate[] = []
    const compensationData: OrderSetStatusUpdate[] = []

    for (const [orderSetId, statuses] of statusesByOrderSet.entries()) {
      const nextStatus = computeOrderSetStatus(statuses)
      
      // If null, items are in mixed states - keep current status unchanged
      if (nextStatus === null) {
        continue
      }

      const currentStatus = orderSetStatuses.get(orderSetId) ?? OrderLineItemStatus.NEW

      if (
        currentStatus === OrderLineItemStatus.NEW &&
        nextStatus === OrderLineItemStatus.ACCEPTED
      ) {
        continue
      }

      if (nextStatus !== currentStatus) {
        updates.push({
          orderSetId,
          status: nextStatus,
          previousStatus: currentStatus
        })

        compensationData.push({
          orderSetId,
          status: currentStatus,
          previousStatus: nextStatus
        })
      }
    }

    if (!updates.length) {
      return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>([], [])
    }

    // 7. Update order sets via the marketplace service
    // Note: Timestamps (accepted_at, packed_at, shipped_at, delivered_at, etc.) 
    // are automatically set by database trigger (trigger_update_order_set_timestamps)
    const shippedOrderSetIds: string[] = []
    const deliveredOrderSetIds: string[] = []

    for (const update of updates) {
      await (marketplaceService.updateOrderSets as any)({
        id: update.orderSetId,
        status: update.status
      })

      if (update.status === OrderLineItemStatus.SHIPPED) {
        shippedOrderSetIds.push(update.orderSetId)
      }
      if (update.status === OrderLineItemStatus.DELIVERED) {
        deliveredOrderSetIds.push(update.orderSetId)
      }
    }

    if (shippedOrderSetIds.length) {
      for (const orderSetId of shippedOrderSetIds) {
        await eventBus.emit({
          name: 'order_set_shipped',
          data: {
            order_set_id: orderSetId
          }
        })
      }
    }

    if (deliveredOrderSetIds.length) {
      for (const orderSetId of deliveredOrderSetIds) {
        await eventBus.emit({
          name: 'order_set_delivered',
          data: {
            order_set_id: orderSetId
          }
        })
      }
    }

    return new StepResponse<OrderSetStatusUpdate[], OrderSetStatusUpdate[]>(
      updates,
      compensationData
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.length) {
      return
    }

    const marketplaceService = container.resolve<MarketplaceModuleService>(
      MARKETPLACE_MODULE
    )

    for (const entry of compensationData) {
      await (marketplaceService.updateOrderSets as any)({
        id: entry.orderSetId,
        status: entry.status
      })
    }
  }
)
