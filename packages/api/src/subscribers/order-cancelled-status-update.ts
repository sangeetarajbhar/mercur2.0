import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Knex } from 'knex'

import { ORDER_LINE_ITEM_EXTENSION_MODULE } from '../modules/order-line-item-extension'
import { MARKETPLACE_MODULE } from '../modules/marketplace'
import OrderLineItemExtensionModuleService from '../modules/order-line-item-extension/service'
import {MercurModules} from '@mercurjs/types'
import MarketplaceModuleService from '../modules/marketplace/service'
import { OrderLineItemStatus } from '../utils/constants/order-statuses'

/**
 * Subscriber that handles order.canceled event to update statuses:
 * 1. Updates all line items in order_line_item_extension table to CANCELLED
 * 2. Updates the order status to CANCELLED in the order table
 * 3. If all line items in order-set are CANCELLED, updates order-set status to CANCELLED
 */
export default async function orderCancelledStatusUpdateHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { id: order_id } = event.data

  if (!order_id) {
    console.warn('[Order Cancelled Status Update] Missing order_id in event data')
    return
  }

  try {
    // 1. Query order with items and order_set relationship
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'items.id',
        'order_set.id',
        'order_set.status'
      ],
      filters: {
        id: order_id
      }
    })

    if (!orders || orders.length === 0) {
      console.warn(`[Order Cancelled Status Update] No order found for order_id: ${order_id}`)
      return
    }

    const order = orders[0]
    const lineItemIds = (order.items || []).map((item: any) => item.id)

    if (lineItemIds.length === 0) {
      console.warn(`[Order Cancelled Status Update] No line items found for order_id: ${order_id}`)
      return
    }

    // 2. Get order line item extensions for this order (include reason_code to preserve RTO)
    const { data: lineItemExtensions } = await query.graph({
      entity: 'order_line_item_extension',
      fields: ['id', 'order_line_item_id', 'status', 'reason_code'],
      filters: {
        order_line_item_id: lineItemIds
      }
    })

    if (!lineItemExtensions || lineItemExtensions.length === 0) {
      console.warn(`[Order Cancelled Status Update] No line item extensions found for order_id: ${order_id}`)
      return
    }

    // 3. Update all line item extensions to CANCELLED status
    // Do not overwrite reason/reason_code when already RTO (set by cancel-order-set-rto workflow)
    const RTO_REASON_CODE = 'RTO'
    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      ORDER_LINE_ITEM_EXTENSION_MODULE
    )

    const now = new Date()
    const updates = lineItemExtensions.map((extension: any) => {
      const update: Record<string, unknown> = {
        id: extension.id,
        status: OrderLineItemStatus.CANCELLED,
        cancelled_at: now
      }
      if (extension.reason_code !== RTO_REASON_CODE) {
        update.reason = 'Order cancelled'
        update.reason_code = 'ORDER_CANCELLED'
      }
      return update
    })

    await orderLineItemExtensionModule.updateOrderLineItemExtensions(updates)

    console.log(`[Order Cancelled Status Update] Updated ${updates.length} line items to CANCELLED for order ${order_id}`)

    // 4. Update the order status to CANCELLED using direct database query
    // Note: We use raw query to bypass MikroORM's entity validation which doesn't know about custom CANCELLED status
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
    
    await knex.raw(`
      UPDATE "order" 
      SET status = ?, updated_at = NOW() 
      WHERE id = ?
    `, ['CANCELLED', order_id])

    console.log(`[Order Cancelled Status Update] Updated order ${order_id} status to CANCELLED`)

    // 6. Check if order is part of an order-set and update order-set status if needed
    const orderSetId = order?.order_set?.id
    
    if (!orderSetId) {
      console.log(`[Order Cancelled Status Update] Order ${order_id} is not part of an order-set`)
      return
    }

    // 7. Get all orders in this order-set by querying from order_set side
    const { data: orderSets } = await query.graph({
      entity: 'order_set',
      fields: [
        'id',
        'orders.id',
        'orders.items.id'
      ],
      filters: {
        id: orderSetId
      }
    })

    if (!orderSets || orderSets.length === 0) {
      console.warn(`[Order Cancelled Status Update] No order-set found: ${orderSetId}`)
      return
    }

    const orderSet = orderSets[0]
    const ordersInSet = orderSet.orders || []

    if (ordersInSet.length === 0) {
      console.warn(`[Order Cancelled Status Update] No orders found in order-set: ${orderSetId}`)
      return
    }

    // 8. Get all line items from all orders in the order-set
    const allLineItemIds = ordersInSet.flatMap((order: any) => 
      (order.items || []).map((item: any) => item.id)
    )

    if (allLineItemIds.length === 0) {
      console.warn(`[Order Cancelled Status Update] No line items found in order-set: ${orderSetId}`)
      return
    }

    // 9. Get all line item extensions for the order-set
    const { data: allLineItemExtensions } = await query.graph({
      entity: 'order_line_item_extension',
      fields: ['id', 'status'],
      filters: {
        order_line_item_id: allLineItemIds
      }
    })

    if (!allLineItemExtensions || allLineItemExtensions.length === 0) {
      console.warn(`[Order Cancelled Status Update] No line item extensions found for order-set: ${orderSetId}`)
      return
    }

    // 10. Check if all line items are CANCELLED
    const allCancelled = allLineItemExtensions.every(
      (extension: any) => extension.status === OrderLineItemStatus.CANCELLED
    )

    // 11. If all line items are CANCELLED, update order-set status
    if (allCancelled) {
      const marketplaceService = container.resolve<MarketplaceModuleService>(
        MARKETPLACE_MODULE
      )

      await (marketplaceService.updateOrderSets as any)({
        id: orderSetId,
        status: OrderLineItemStatus.CANCELLED,
        cancelled_at: now
      })

      console.log(`[Order Cancelled Status Update] Updated order-set ${orderSetId} to CANCELLED (all line items cancelled)`)
    } else {
      console.log(`[Order Cancelled Status Update] Order-set ${orderSetId} has non-cancelled line items, status not changed`)
    }

  } catch (error) {
    console.error('[Order Cancelled Status Update] Error processing order.canceled event:', error instanceof Error ? error.message : error)
    // Re-throw the error so Medusa knows the subscriber failed
    throw error
  }
}

export const config: SubscriberConfig = {
  event: 'order.canceled',
  context: {
    subscriberId: 'order-cancelled-status-update-handler'
  }
}

