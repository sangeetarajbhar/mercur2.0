import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { updateStockLocationSectionStep } from '../steps'
import { UpdateStockLocationSectionDTO } from '../../../modules/stock-location-section/types/mutations'

export const updateStockLocationSectionWorkflow = createWorkflow(
  'update-stock-location-section',
  function (input: UpdateStockLocationSectionDTO) {
    const updatedSection = updateStockLocationSectionStep(input)
    return new WorkflowResponse(updatedSection)
  }
)
