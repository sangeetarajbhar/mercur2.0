import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import OrderLineItemExtensionModuleService from '../../../modules/order-line-item-extension/service'

interface UpdateLineItemsWithShipmentIdInput {
  shipmentId: string
  lineItemExtensionIds: string[]
}

export const updateLineItemsWithShipmentIdStep = createStep(
  'update-line-items-with-shipment-id',
  async (input: UpdateLineItemsWithShipmentIdInput, { container }) => {
    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      'order_line_item_extension'
    )

    // Update all line item extensions with the shipment_id (fulfillment ID)
    const updateDataArray = input.lineItemExtensionIds.map(extensionId => ({
      id: extensionId,
      shipment_id: input.shipmentId
    }))

    const updatedExtensions = await orderLineItemExtensionModule.updateOrderLineItemExtensions(
      updateDataArray
    )

    return new StepResponse(updatedExtensions, { lineItemExtensionIds: input.lineItemExtensionIds, shipmentId: input.shipmentId })
  },
  async (compensationData, { container }) => {
    // Compensation logic: revert the shipment_id updates
    if (!compensationData?.lineItemExtensionIds) return

    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      'order_line_item_extension'
    )

    const revertDataArray = compensationData.lineItemExtensionIds.map((extensionId: string) => ({
      id: extensionId,
      shipment_id: null
    }))

    await orderLineItemExtensionModule.updateOrderLineItemExtensions(revertDataArray)
  }
)

