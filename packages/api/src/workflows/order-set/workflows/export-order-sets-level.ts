import { WorkflowResponse, createWorkflow } from '@medusajs/workflows-sdk'
import {
  OrderSetExportFilters,
  exportOrderSetsLevelStreamingStep,
} from '../steps'

export const exportOrderSetsLevelWorkflow = createWorkflow(
  'export-order-sets-level',
  function (filters: OrderSetExportFilters) {
    const file = exportOrderSetsLevelStreamingStep(filters)

    return new WorkflowResponse(file)
  }
)

