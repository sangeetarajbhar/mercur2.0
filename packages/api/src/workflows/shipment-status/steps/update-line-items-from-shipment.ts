import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import OrderLineItemExtensionModuleService from '../../../modules/order-line-item-extension/service'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

interface UpdateLineItemsFromShipmentInput {
  shipments: Array<{
    shipment_id: string
    order_line_item_id: string
    currentStatus: string
  }>
  status: string
}

export const updateLineItemsFromShipmentStep = createStep(
  'update-line-items-from-shipment',
  async (input: UpdateLineItemsFromShipmentInput, { container }) => {
    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      'order_line_item_extension'
    )
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const compensationData: any[] = []

    // Get unique shipment_ids from input
    const shipmentIds = [...new Set(input.shipments.map((s) => s.shipment_id))]

    // Find order line item extensions by shipment_id directly
    const extensions = await knex('order_line_item_extension')
      .select('id', 'order_line_item_id', 'status', 'shipment_id')
      .whereIn('shipment_id', shipmentIds)

    // Build compensation data and update data arrays for batch processing
    const updateDataArray: any[] = []
    
    for (const extension of extensions) {
      // Store original state for compensation
      compensationData.push({
        id: extension.id,
        currentStatus: extension.status,
        newStatus: input.status
      })

      updateDataArray.push({
        id: extension.id,
        status: input.status
        // Timestamps will be auto-set by database trigger based on status
      })
    }

    // OPTIMIZED: Single batch update instead of individual updates in loop
    const updates = updateDataArray.length > 0 
      ? await orderLineItemExtensionModule.updateOrderLineItemExtensions(updateDataArray)
      : []

    // COMMENTED OUT: Old inefficient approach with N+1 database calls
    // for (const extension of extensions) {
    //   // Store original state for compensation
    //   compensationData.push({
    //     id: extension.id,
    //     currentStatus: extension.status,
    //     newStatus: input.status
    //   })

    //   const updateData: any = {
    //     id: extension.id,
    //     status: input.status
    //     // Timestamps will be auto-set by database trigger based on status
    //   }

    //   const [updated] = await orderLineItemExtensionModule.updateOrderLineItemExtensions([
    //     updateData
    //   ])
    //   updates.push(updated)
    // }

    // Return updates as result, compensationData for rollback
    return new StepResponse(updates, compensationData)
  },
  async (compensationData, { container }) => {
    // Compensation logic: revert the status changes
    if (!compensationData || compensationData.length === 0) return

    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      'order_line_item_extension'
    )

    // OPTIMIZED: Build revert data array for batch processing
    const revertDataArray = compensationData.map(item => ({
      id: item.id,
      status: item.currentStatus // Revert to original status
      // Note: Timestamps cannot be easily reverted with database triggers
      // Consider if compensation logic needs to be more sophisticated
    }))

    // OPTIMIZED: Single batch update instead of individual updates in loop
    await orderLineItemExtensionModule.updateOrderLineItemExtensions(revertDataArray)

    // COMMENTED OUT: Old inefficient approach with N+1 database calls
    // for (const item of compensationData) {
    //   const revertData: any = {
    //     id: item.id,
    //     status: item.currentStatus // Revert to original status
    //     // Note: Timestamps cannot be easily reverted with database triggers
    //     // Consider if compensation logic needs to be more sophisticated
    //   }

    //   await orderLineItemExtensionModule.updateOrderLineItemExtensions([
    //     revertData
    //   ])
    // }
  }
)

