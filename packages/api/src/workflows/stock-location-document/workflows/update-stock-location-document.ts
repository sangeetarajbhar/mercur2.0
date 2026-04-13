import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { updateStockLocationDocumentStep } from '../steps'
import { UpdateStockLocationDocumentDTO } from '../../../modules/stock-location-document/types/mutations'

export const updateStockLocationDocumentWorkflow = createWorkflow(
  'update-stock-location-document',
  function (input: UpdateStockLocationDocumentDTO) {
    const updatedDocument = updateStockLocationDocumentStep(input)

    return new WorkflowResponse(updatedDocument)
  }
)
