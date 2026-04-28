import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import OrderLineItemExtensionModuleService from '../../../modules/order-line-item-extension/service'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

interface UpdatePackedLineItemsWithShipmentInput {
  shipmentId: string
  validatedLineItems: Array<{
    orderLineItemExtensionId: string
    currentStatus: OrderLineItemStatus
  }>
}

export const updatePackedLineItemsWithShipmentStep = createStep(
  'update-packed-line-items-with-shipment',
  async (input: UpdatePackedLineItemsWithShipmentInput, { container }) => {
    const logPrefix = '[update-packed-line-items-with-shipment]'
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      'order_line_item_extension'
    )

    const updateDataArray = input.validatedLineItems.map((item) => ({
      id: item.orderLineItemExtensionId,
      status: OrderLineItemStatus.PACKED,
      shipment_id: input.shipmentId
    }))

    logger.log(`${logPrefix} Updating packed status and shipment_id: ${JSON.stringify({
      shipmentId: input.shipmentId,
      extensionCount: updateDataArray.length
    })}`)

    const updatedExtensions = await orderLineItemExtensionModule.updateOrderLineItemExtensions(
      updateDataArray
    )

    logger.log(`${logPrefix} Updated packed status and shipment_id successfully: ${JSON.stringify({
      shipmentId: input.shipmentId,
      updatedCount: updatedExtensions.length
    })}`)

    const compensationData = input.validatedLineItems.map((item) => ({
      id: item.orderLineItemExtensionId,
      previousStatus: item.currentStatus
    }))

    return new StepResponse(updatedExtensions, compensationData)
  },
  async (compensationData, { container }) => {
    if (!compensationData?.length) return
    const logPrefix = '[update-packed-line-items-with-shipment]'
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      'order_line_item_extension'
    )

    const revertDataArray = compensationData.map((item: { id: string; previousStatus: OrderLineItemStatus }) => ({
      id: item.id,
      status: item.previousStatus,
      shipment_id: null
    }))

    await orderLineItemExtensionModule.updateOrderLineItemExtensions(revertDataArray)
    logger.warn(`${logPrefix} Compensation executed: ${JSON.stringify({
      revertedCount: revertDataArray.length
    })}`)
  }
)
