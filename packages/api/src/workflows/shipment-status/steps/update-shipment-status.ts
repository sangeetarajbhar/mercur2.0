import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

interface UpdateShipmentStatusInput {
  shipments: Array<{
    id: string
    shipment_id: string
    order_line_item_id: string
    currentStatus: string
  }>
  status: string
}

export const updateShipmentStatusStep = createStep(
  'update-shipment-status',
  async (input: UpdateShipmentStatusInput, { container }) => {
    // NOTE: With new schema, we no longer maintain status in order_shipment table
    // All status tracking is done at order_line_item_extension level
    // This step is kept for workflow compatibility but does nothing
    
    // Return empty array as no shipment updates are needed
    const updates: any[] = []

    return new StepResponse(updates, [])
  },
  async (compensationData, { container }) => {
    // NOTE: No compensation needed since we don't update shipment table anymore
    // All status changes are handled at order_line_item_extension level
    return
  }
)

