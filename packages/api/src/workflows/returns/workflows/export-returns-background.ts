import { WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { Modules } from '@medusajs/framework/utils'

interface ExportFilters {
  status?: string
  created_at?: string | { start_date?: string; end_date?: string }
  updated_at?: string | { start_date?: string; end_date?: string }
  customer_id?: string
  order_id?: string
}

interface BackgroundExportInput extends ExportFilters {
  user_id: string
  transaction_id: string
  channel?: string
}

const triggerBackgroundExportStep = createStep(
  'trigger-background-returns-export',
  async (input: BackgroundExportInput, { container }) => {
    const { user_id, transaction_id, channel, ...filters } = input
    const eventBusService = container.resolve(Modules.EVENT_BUS)
    
    // Determine channel: use provided channel or default to 'feed' for admin
    const notificationChannel = channel || 'feed'
    
    await eventBusService.emit({
      name: 'returns-export.process-background',
      data: {
        transaction_id,
        user_id,
        filters,
        notification: {
          to: user_id,
          channel: notificationChannel,
          template: 'returns-export-completed'
        },
        redirectNotification: '/requests/return-requests'
      }
    })

    return new StepResponse({
      transaction_id,
      status: 'processing',
      message: 'Export started in background. You will be notified when it completes.'
    })
  }
)

export const exportReturnsBackgroundWorkflow = createWorkflow(
  'export-returns-background',
  function (input: BackgroundExportInput) {
    const result = triggerBackgroundExportStep(input)
    return new WorkflowResponse(result)
  }
)



