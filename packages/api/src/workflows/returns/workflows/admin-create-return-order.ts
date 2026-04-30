import { createWorkflow, WorkflowResponse, transform } from '@medusajs/framework/workflows-sdk'
import { createAndCompleteReturnOrderWorkflow } from '@medusajs/medusa/core-flows'
import { processAdminReturnOrderStep } from '../steps'
import { MedusaError } from '@medusajs/framework/utils'

interface AdminCreateReturnOrderInput {
  orderId: string
  orderLineItemId: string
  reason_id?: string
  note?: string
  receive_now?: boolean
  location_id?: string
  return_shipping?: {
    option_id: string
    price?: number
  }
}

/**
 * Admin workflow for creating a return order
 * Processes orderId and orderLineItemId and calls createAndCompleteReturnOrderWorkflow
 */
export const adminCreateReturnOrderWorkflow = createWorkflow(
  'admin-create-return-order',
  (input: AdminCreateReturnOrderInput) => {
    try {
      // Process the admin return order with orderId and orderLineItemId
      const processedReturn = processAdminReturnOrderStep({
        orderId: input.orderId,
        orderLineItemId: input.orderLineItemId
      })

      // Transform the processed data to match the core workflow input format
      const returnOrderInput = transform(
        { processedReturn, input },
        ({ processedReturn, input }) => {
          return {
            order_id: processedReturn.orderId,
            items: [
              {
                id: processedReturn.orderLineItemId,
                quantity: 1,
                reason_id: input.reason_id,
                note: input.note
              }
            ],
            ...(input.location_id ? { location_id: input.location_id } : {}),
            return_shipping: input.return_shipping
          }
        }
      )

      // Call the core createAndCompleteReturnOrderWorkflow
      const result = createAndCompleteReturnOrderWorkflow.runAsStep({
        input: returnOrderInput
      })  

      return new WorkflowResponse(result)
    } catch (e) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Error creating admin return order'
      )
    }
  }
)


