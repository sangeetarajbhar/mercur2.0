import { createWorkflow, WorkflowData, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { updateStockLocationContactStep } from '../steps'
import { UpdateStockLocationContactDTO } from '../../../modules/stock-location-contact/types/mutations'

export const updateStockLocationContactWorkflow = createWorkflow(
  'update-stock-location-contact',
  function (input: WorkflowData<UpdateStockLocationContactDTO>) {
    const updatedContact = updateStockLocationContactStep(input)

    return new WorkflowResponse(updatedContact)
  }
)
