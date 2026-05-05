import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

import { MARKETPLACE_MODULE} from '../../../../../modules/marketplace'
import MarketplaceModuleService from '../../../../../modules/marketplace/service'
import { ShipmentStatus } from '../../../../../utils/constants/order-statuses'
import { UpdateShipmentStatusType } from './validators'
import { cancelOrderSetRtoWorkflow } from '../../../../../workflows/order-set/workflows/cancel-order-set-rto'
import { updateOrderSetShipmentStatusWorkflow } from '../../../../../workflows/shipment-status/workflows/update-order-set-shipment-status'
import { createReturnsForDeliveredItemsWorkflow } from '../../../../../workflows/pidge/workflows/create-returns-for-delivered-items'

type StatusHandler = (
  orderSet: Record<string, unknown>,
  payload: UpdateShipmentStatusType
) => { updates: Record<string, unknown>; error?: string }

const statusHandlers: Record<string, StatusHandler> = {

  [ShipmentStatus.RIDER_ASSIGNED]: (orderSet, payload) => {
    if (orderSet.status !== ShipmentStatus.PACKED) {
      return { updates: {}, error: 'Order set must be in PACKED status' }
    }
    return {
      updates: {
        rider_assigned_at: new Date(),
        metadata: payload.metadata
      }
    }
  },

  [ShipmentStatus.SHIPPED]: (orderSet, payload) => {
    if (!orderSet.rider_assigned_at) {
      return { updates: {}, error: 'Rider must be assigned before shipping' }
    }
    return {
      updates: {
        status: ShipmentStatus.SHIPPED,
        shipped_at: new Date(),
        metadata: payload.metadata
      }
    }
  },

  [ShipmentStatus.DELIVERED]: (orderSet) => {
    if (orderSet.status !== ShipmentStatus.SHIPPED) {
      return { updates: {}, error: 'Order set must be in SHIPPED status' }
    }
    return {
      updates: {
        status: ShipmentStatus.DELIVERED,
        delivered_at: new Date()
      }
    }
  },

  [ShipmentStatus.UNDELIVERED]: (orderSet) => {
    if (orderSet.status !== ShipmentStatus.SHIPPED) {
      return { updates: {}, error: 'Order set must be in SHIPPED status' }
    }
    // Order set status/cancelled_at is updated by cancelOrderSetRtoWorkflow (or its subscribers)
    return { updates: {} }
  }
}

export const PATCH = async (
  req: AuthenticatedMedusaRequest<UpdateShipmentStatusType>,
  res: MedusaResponse
) => {
  const tracking_id = req.params.id
  const { status, metadata, returned_items } = req.validatedBody

  // if (status === ShipmentStatus.DELIVERED) {
  //   console.log('[admin/order-sets/shipment] called with status DELIVERED', {
  //     tracking_id,
  //     payload: req.validatedBody
  //   })
  // }

  if (!tracking_id?.trim()) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, 'tracking_id is required')
  }

  const marketplaceService = req.scope.resolve(MARKETPLACE_MODULE) as MarketplaceModuleService

  const [orderSet] = await marketplaceService.listOrderSets({ tracking_id })

  if (!orderSet) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Order set not found')
  }

  const handler = statusHandlers[status]
  const { updates, error } = handler(orderSet, { status, metadata })

  if (error) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error)
  }

  if (Object.keys(updates).length > 0) {
    await marketplaceService.updateOrderSets({
      id: orderSet.id,
      ...updates
    })
  }

  if (status === ShipmentStatus.SHIPPED || status === ShipmentStatus.DELIVERED) {
    await updateOrderSetShipmentStatusWorkflow(req.scope).run({
      input: {
        order_set_id: orderSet.id,
        status
      }
    })
  }

  if (status === ShipmentStatus.UNDELIVERED) {
    await cancelOrderSetRtoWorkflow(req.scope).run({
      input: {
        order_set_id: orderSet.id,
        canceled_by: req.auth_context.actor_id
      }
    })
  }

  // Process returned items if status is DELIVERED and returned_items is provided
  if (status === ShipmentStatus.DELIVERED && returned_items && returned_items.length > 0) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Query order set with orders and items to find which order each returned item belongs to
    const { data: orderSets } = await query.graph({
      entity: 'order_set',
      fields: [
        'id',
        'orders.id',
        'orders.items.id'
      ],
      filters: {
        id: orderSet.id
      }
    })

    if (orderSets && orderSets.length > 0) {
      const orderSetData = orderSets[0]
      const orders = orderSetData.orders || []

      // Create a map of line item ID to order ID
      const lineItemToOrderMap = new Map<string, string>()
      for (const order of orders) {
        const items = (order as any).items || []
        for (const item of items) {
          lineItemToOrderMap.set(item.id, (order as any).id)
        }
      }

      // Group returned items by order
      const itemsByOrder = new Map<string, string[]>()
      for (const lineItemId of returned_items) {
        const orderId = lineItemToOrderMap.get(lineItemId)
        if (orderId) {
          if (!itemsByOrder.has(orderId)) {
            itemsByOrder.set(orderId, [])
          }
          itemsByOrder.get(orderId)!.push(lineItemId)
        } else {
          console.warn(`Line item ${lineItemId} not found in order set ${orderSet.id}`)
        }
      }

      // Call createReturnsForDeliveredItemsWorkflow for each order
      const returnResults: Array<{ orderId: string; result?: any; error?: string; success: boolean }> = []
      for (const [orderId, lineItemIds] of itemsByOrder) {
        try {
          const { result } = await createReturnsForDeliveredItemsWorkflow(req.scope).run({
            input: {
              lineItemId: lineItemIds,
              orderId
            }
          })
          returnResults.push({ orderId, result, success: true })
        } catch (stepError: any) {
          console.error(`Error processing returns for order ${orderId}:`, stepError)
          returnResults.push({ orderId, error: stepError.message, success: false })
        }
      }

      return res.json({ 
        message: 'Shipment status updated successfully',
        returnResults 
      })
    }
  }

  res.json({ message: 'Shipment status updated successfully' })
}
