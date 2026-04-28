import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Knex } from 'knex'

import { ORDER_LINE_ITEM_EXTENSION_MODULE } from '../modules/order-line-item-extension'
import { MARKETPLACE_MODULE } from '../modules/marketplace'
import OrderLineItemExtensionModuleService from '../modules/order-line-item-extension/service'
import  MarketplaceModuleService  from '../modules/marketplace/service'
import { OrderLineItemStatus } from '../utils/constants/order-statuses'

/**
 * Subscriber that handles payment.success event to update statuses:
 * 1. Updates all line items in order_line_item_extension table to RFR
 * 2. Updates the order status to RFR in the order table
 * 3. Updates order-set status to NEW
 */
export default async function paymentSuccessStatusUpdateHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { id: orderSetId } = event.data

  if (!orderSetId) {
    console.warn('[Payment Success Status Update] Missing order_set id in event data')
    return
  }

  try {
    // 1. Query order_set with orders and line items
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
      console.warn(`[Payment Success Status Update] No order-set found for id: ${orderSetId}`)
      return
    }

    const orderSet = orderSets[0]
    const orders = orderSet.orders || []

    if (orders.length === 0) {
      console.warn(`[Payment Success Status Update] No orders found in order-set: ${orderSetId}`)
      return
    }

    // 2. Get all line items from all orders in the order-set
    const allLineItemIds = orders.flatMap((order: any) => 
      (order.items || []).map((item: any) => item.id)
    )

    if (allLineItemIds.length === 0) {
      console.warn(`[Payment Success Status Update] No line items found in order-set: ${orderSetId}`)
      return
    }

    // 3. Get all line item extensions for the order-set
    const { data: lineItemExtensions } = await query.graph({
      entity: 'order_line_item_extension',
      fields: ['id', 'order_line_item_id', 'status'],
      filters: {
        order_line_item_id: allLineItemIds
      }
    })

    if (!lineItemExtensions || lineItemExtensions.length === 0) {
      console.warn(`[Payment Success Status Update] No line item extensions found for order-set: ${orderSetId}`)
      return
    }

    // 4. Update all line item extensions to RFR status
    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      ORDER_LINE_ITEM_EXTENSION_MODULE
    )

    const updates = lineItemExtensions.map((extension: any) => ({
      id: extension.id,
      status: OrderLineItemStatus.RFR
    }))

    await orderLineItemExtensionModule.updateOrderLineItemExtensions(updates)

    console.log(`[Payment Success Status Update] Updated ${updates.length} line items to RFR for order-set ${orderSetId}`)

    // 5. Update all orders status to RFR using direct database query
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
    const orderIds = orders.map((order: any) => order.id)
    
    await knex('order')
      .whereIn('id', orderIds)
      .update({
        status: OrderLineItemStatus.RFR,
        updated_at: knex.fn.now()
      })

    console.log(`[Payment Success Status Update] Updated ${orderIds.length} orders to RFR status for order-set ${orderSetId}`)

    // 6. Update order-set status to NEW
    const marketplaceService = container.resolve<MarketplaceModuleService>(
      MARKETPLACE_MODULE
    )

    await (marketplaceService.updateOrderSets as any)({
      id: orderSetId,
      status: OrderLineItemStatus.NEW
    })

    console.log(`[Payment Success Status Update] Updated order-set ${orderSetId} to NEW status`)

  } catch (error) {
    console.error('[Payment Success Status Update] Error processing payment.success event:', error instanceof Error ? error.message : error)
    // Re-throw the error so Medusa knows the subscriber failed
    throw error
  }
}

export const config: SubscriberConfig = {
  event: 'payment.success',
  context: {
    subscriberId: 'payment-success-status-update-handler'
  }
}
