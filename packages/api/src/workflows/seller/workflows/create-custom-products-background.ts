import { WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { Modules } from '@medusajs/framework/utils'

interface ExportFilters {
  seller_id?: string
  brand_id?: string
  category_id?: string
  status?: string
  created_at?: string
  updated_at?: string
  tag_id?: string
  type_id?: string
  sales_channel_id?: string
}

interface BackgroundExportInput extends ExportFilters {
  user_id: string
  transaction_id: string
  channel?: string  // Optional channel, defaults based on context
}

const triggerBackgroundExportStep = createStep(
  'trigger-background-export',
  async (input: BackgroundExportInput, { container }) => {
    const { user_id, transaction_id, channel, ...filters } = input
    const eventBusService = container.resolve(Modules.EVENT_BUS)
    
    // Determine channel: use provided channel or default to 'feed' for admin, 'seller_feed' for vendor
    const notificationChannel = channel || (filters.seller_id ? 'seller_feed' : 'feed')
    
    await eventBusService.emit({
      name: 'product-export.process-background',
      data: {
        transaction_id,
        user_id,
        filters,
        notification: {
          to: user_id,
          channel: notificationChannel,
          template: 'product-export-completed'
        },
        redirectNotification: '/products'
      }
    })

    return new StepResponse({
      transaction_id,
      status: 'processing',
      message: 'Export started in background. You will be notified when it completes.'
    })
  }
)

export const exportCustomProductsBackgroundWorkflow = createWorkflow(
  'export-custom-products-background',
  function (input: BackgroundExportInput) {
    const result = triggerBackgroundExportStep(input)
    return new WorkflowResponse(result)
  }
)
