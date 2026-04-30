import { createWorkflow, WorkflowResponse, transform, when } from '@medusajs/framework/workflows-sdk'
import { createAndCompleteReturnOrderWorkflow as coreCreateAndCompleteReturnOrderWorkflow } from '@medusajs/medusa/core-flows'
import { updateReturnableFlagForReturnedItemsStep } from '../steps'
import { MedusaError } from '@medusajs/framework/utils'

/**
 * Custom wrapper workflow for createAndCompleteReturnOrderWorkflow
 * that also updates the returnable_flag for returned items
 */
export const createAndCompleteReturnOrderWithFlagUpdateWorkflow = createWorkflow(
  'create-and-complete-return-order-with-flag-update',
  (input: any) => {
    // Run the core workflow
    try{
    const result = coreCreateAndCompleteReturnOrderWorkflow.runAsStep({
      input
    })
    
    // Update returnable_flag to false for all items being returned
    when(input, (input) => input.items && input.items.length > 0).then(() => {
      const lineItemIds = transform({ input }, ({ input }) => 
        input.items.map((item: any) => item.id)
    )
    updateReturnableFlagForReturnedItemsStep({ lineItemIds })
  })
  
  return new WorkflowResponse(result)
}catch(e){
  throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Error creating and completing return order')
}
  }
)

