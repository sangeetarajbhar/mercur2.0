import { createWorkflow, transform, when } from '@medusajs/framework/workflows-sdk'
import { validateRfrToNewUpdateStep, ValidateRfrToNewUpdateInput } from '../steps/validate-rfr-to-new-update'
import { updateOrderRfrToNewStep } from '../steps/update-order-rfr-to-new'

export interface UpdateOrderRfrToNewWorkflowInput {
  marketplaceOrderId: string
}

export const updateOrderRfrToNewWorkflow = createWorkflow(
  'update-order-rfr-to-new',
  function (input: UpdateOrderRfrToNewWorkflowInput) {
    // Step 1: Validate the request
    const validationResult = validateRfrToNewUpdateStep({
      marketplaceOrderId: input.marketplaceOrderId
    })

    const skipStatusUpdateRef = transform(validationResult, (data) => data.skipStatusUpdate ?? false)

    // Step 2: Update order and line items from RFR to NEW (only if not already NEW)
    when(
      { skipStatusUpdate: skipStatusUpdateRef },
      ({ skipStatusUpdate }) => !skipStatusUpdate
    ).then(() => {
      return updateOrderRfrToNewStep(
        transform({ validationResult }, ({ validationResult }) => ({
          orderId: validationResult.orderId,
          lineItemExtensionIds: validationResult.lineItemExtensionIds
        }))
      )
    })
  }
)

