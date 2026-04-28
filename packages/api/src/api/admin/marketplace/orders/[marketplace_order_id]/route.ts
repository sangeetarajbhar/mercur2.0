import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'

import { updateOrderRfrToNewWorkflow } from '../../../../../workflows/order-status/workflows/update-order-rfr-to-new'
import { adjustInventoryOnOrderAcknowledgementWorkflow } from '../../../../../workflows/order/workflows/adjust-inventory-on-order-acknowledgement'
import { updateOrderStatusWorkflow } from '../../../../../workflows/order-status/workflows/update-order-status'
import { OrderLineItemStatus as OrderStatus } from '../../../../../utils/constants/order-statuses'
import { ORDER_EXTRA_DETAIL_MODULE } from '../../../../../modules/order-extra-detail'
import OrderExtraDetailModuleService from '../../../../../modules/order-extra-detail/service'
import { UpdateMarketplaceOrderInput, UpdateStatusInput } from './validators'

const resolveShipmentId = (shipmentResult: unknown): string | undefined => {
  if (Array.isArray(shipmentResult) && shipmentResult.length > 0) {
    const first = shipmentResult[0] as { shipment_id?: string; id?: string }
    return first?.shipment_id || first?.id
  }

  if (shipmentResult && typeof shipmentResult === 'object') {
    const single = shipmentResult as { shipment_id?: string; id?: string }
    return single.shipment_id || single.id
  }

  return undefined
}

const handleTrackingUpdate = async (
  req: AuthenticatedMedusaRequest<UpdateMarketplaceOrderInput>,
  res: MedusaResponse
) => {
  const marketplaceOrderId =
    (req.params as any).marketplace_order_id ?? (req.params as any).marketPlaceOrderId
  const { tracking_id, courier_code } = req.validatedBody as Extract<
    UpdateMarketplaceOrderInput,
    { update: 'tracking-details' }
  >

  const orderExtraDetailService = req.scope.resolve(ORDER_EXTRA_DETAIL_MODULE) as OrderExtraDetailModuleService

  const [orderExtraDetail] = await orderExtraDetailService.listOrderExtraDetails({
    marketplace_order_id: marketplaceOrderId
  })

  if (!orderExtraDetail) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Order not found')
  }

  // Check if tracking_id and courier_code combination already exists
  const [existingOrderExtraDetail] = await orderExtraDetailService.listOrderExtraDetails({
    tracking_id,
    courier_code
  })

  if (existingOrderExtraDetail && existingOrderExtraDetail.id !== orderExtraDetail.id) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Tracking ID "${tracking_id}" with courier code "${courier_code}" already exists for another order`
    )
  }

  await orderExtraDetailService.updateOrderExtraDetails({
    id: orderExtraDetail.id,
    tracking_id,
    courier_code
  })

  return res.json({ message: 'Tracking details added successfully' })
}

const handleConfirmUpdate = async (
  req: AuthenticatedMedusaRequest<UpdateMarketplaceOrderInput>,
  res: MedusaResponse
) => {
  const marketplaceOrderId =
    (req.params as any).marketplace_order_id ?? (req.params as any).marketPlaceOrderId

  if (!marketplaceOrderId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Marketplace order ID is required'
    )
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orderExtraDetail } = await query.graph({
      entity: 'order_extra_detail',
      fields: ['id', 'order_id'],
      filters: { marketplace_order_id: marketplaceOrderId }
    })

    if (!orderExtraDetail?.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order not found for marketplace order ID: ${marketplaceOrderId}`
      )
    }

    const orderId = orderExtraDetail[0].order_id

    await updateOrderRfrToNewWorkflow(req.scope).run({
      input: { marketplaceOrderId: marketplaceOrderId }
    })

    await adjustInventoryOnOrderAcknowledgementWorkflow(req.scope).run({
      input: { order_id: orderId }
    })

    const orderExtraDetailService = req.scope.resolve<OrderExtraDetailModuleService>(ORDER_EXTRA_DETAIL_MODULE)

    await orderExtraDetailService.updateOrderExtraDetails({
      id: orderExtraDetail[0].id,
      confirmed_at: new Date()
    })

    return res.status(200).json({
      status: 'SUCCESS',
      message: 'Order and line items status updated from RFR to NEW successfully, and inventory adjusted'
    })
  } catch (error: any) {
    if (error instanceof MedusaError) {
      throw error
    }

    if (error?.__isMedusaError && error?.type && error?.message) {
      const typeMap: Record<string, any> = {
        'not_found': MedusaError.Types.NOT_FOUND,
        'invalid_data': MedusaError.Types.INVALID_DATA,
        'not_allowed': MedusaError.Types.NOT_ALLOWED,
        'unexpected_state': MedusaError.Types.UNEXPECTED_STATE,
        'duplicate_error': MedusaError.Types.DUPLICATE_ERROR,
        'unauthorized': MedusaError.Types.UNAUTHORIZED
      }

      throw new MedusaError(
        typeMap[error.type] || MedusaError.Types.UNEXPECTED_STATE,
        error.message,
        error.code
      )
    }

    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : error?.message || 'Unknown error'

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to update order status: ${errorMessage}`
    )
  }
}

const handleStatusUpdate = async (
  req: AuthenticatedMedusaRequest<UpdateMarketplaceOrderInput>,
  res: MedusaResponse
) => {
  const logPrefix = '[admin-marketplace-order-status]'
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const marketPlaceOrderId = ((req.params as any).marketplace_order_id ??
    (req.params as any).marketPlaceOrderId) as string
  const payload = req.validatedBody

  if (payload.update !== 'status' || payload.status === OrderStatus.NEW) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Invalid status update payload'
    )
  }

  const { status, locationCode, lineItems } = payload as UpdateStatusInput
  logger.log(`${logPrefix} Received status update request: ${JSON.stringify({
    marketplaceOrderId: marketPlaceOrderId,
    status,
    locationCode,
    lineItemCount: lineItems.length
  })}`)

  const workflow = updateOrderStatusWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      marketplaceOrderId: marketPlaceOrderId,
      status,
      locationCode,
      lineItems
    }
  })

  if (status === OrderStatus.PACKED) {
    const shipmentId = resolveShipmentId(result.shipmentResult) || result.existingShipmentId
    logger.log(`${logPrefix} PACKED workflow completed: ${JSON.stringify({
      marketplaceOrderId: marketPlaceOrderId,
      shipmentId: shipmentId ?? null,
      usedExistingShipmentId: !resolveShipmentId(result.shipmentResult) && !!result.existingShipmentId
    })}`)

    const eventBus = req.scope.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: 'order.packed',
      data: {
        marketplaceOrderId: marketPlaceOrderId,
        shipmentId: shipmentId ?? null,
        locationCode,
        lineItems
      }
    })
    logger.log(`${logPrefix} Emitted order.packed event: ${JSON.stringify({
      marketplaceOrderId: marketPlaceOrderId,
      shipmentId: shipmentId ?? null,
      lineItemCount: lineItems.length
    })}`)

    if (shipmentId) {
      const orderExtraDetailService = req.scope.resolve<OrderExtraDetailModuleService>(ORDER_EXTRA_DETAIL_MODULE)
      const [orderExtraDetail] = await orderExtraDetailService.listOrderExtraDetails({
        marketplace_order_id: marketPlaceOrderId
      })

      return res.status(200).json({
        status: 'SUCCESS',
        message: 'Shipment created successfully',
        data: {
          marketplaceOrderId: marketPlaceOrderId,
          shipmentId: shipmentId,
          trackingId: orderExtraDetail?.tracking_id,
          courierCode: orderExtraDetail?.courier_code,
          lineItems: lineItems.map(item => ({
            lineItemId: item.lineItemId,
            locationCode: locationCode
          }))
        }
      })
    }
  }

  if (status === OrderStatus.CANCELLED || status === OrderStatus.REJECTED) {
    const orderExtraDetailService = req.scope.resolve<OrderExtraDetailModuleService>(ORDER_EXTRA_DETAIL_MODULE)
    const [orderExtraDetail] = await orderExtraDetailService.listOrderExtraDetails({
      marketplace_order_id: marketPlaceOrderId
    })
    if (orderExtraDetail?.order_id) {
      const eventBus = req.scope.resolve(Modules.EVENT_BUS)
      for (const item of lineItems) {
        await eventBus.emit({
          name: 'item.cancelled',
          data: {
            order_id: orderExtraDetail.order_id,
            line_item_id: item.lineItemId
          }
        })
      }
    }
  }
  
  const statusMessages: Record<string, string> = {
    [OrderStatus.ACCEPTED]: 'Order accepted successfully',
    [OrderStatus.REJECTED]: 'Order rejected successfully',
    [OrderStatus.CANCELLED]: 'Order cancelled successfully'
  }

 
  return res.status(200).json({
    status: 'SUCCESS',
    message: statusMessages[status] || 'Order status updated successfully'
  })
}

const handleUpdate = async (
  req: AuthenticatedMedusaRequest<UpdateMarketplaceOrderInput>,
  res: MedusaResponse
) => {
  const payload = req.validatedBody
  if (!payload) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Missing or invalid request body'
    )
  }

  if (payload.update === 'tracking-details') {
    return handleTrackingUpdate(req, res)
  }

  if (payload.update === 'status' && payload.status === OrderStatus.NEW) {
    return handleConfirmUpdate(req, res)
  }

  return handleStatusUpdate(req, res)
}

export const PATCH = handleUpdate
