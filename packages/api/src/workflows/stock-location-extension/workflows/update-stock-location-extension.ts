import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { updateStockLocationExtensionStep } from '../steps'
import { UpdateStockLocationExtensionDTO } from '../../../modules/stock-location-extension/types/mutations'

export const updateStockLocationExtensionWorkflow = createWorkflow(
  'update-stock-location-extension',
  function (input: UpdateStockLocationExtensionDTO) {
    const updatedExtension = updateStockLocationExtensionStep(input)

    return new WorkflowResponse(updatedExtension)
  }
)
