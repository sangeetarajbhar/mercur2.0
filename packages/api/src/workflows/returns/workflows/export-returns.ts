import { WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'

import {
  getReturnsForExportStep, generateReturnsCsvStep
} from '../steps'

interface ExportFilters {
  status?: string
  created_at?: string | { start_date?: string; end_date?: string }
  updated_at?: string | { start_date?: string; end_date?: string }
  customer_id?: string
  order_id?: string
}

export const exportReturnsWorkflow = createWorkflow(
  'export-returns',
  function (filters: ExportFilters) {
    // Get comprehensive return data including all related entities
    const returnData = getReturnsForExportStep(filters)

    // Generate CSV file with all the data
    const file = generateReturnsCsvStep(returnData)

    return new WorkflowResponse(file)
  }
)

