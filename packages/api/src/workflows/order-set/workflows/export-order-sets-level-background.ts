import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { Modules } from '@medusajs/framework/utils'
// import { WorkflowResponse, createWorkflow } from '@medusajs/workflows-sdk'
import { WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { OrderSetExportFilters } from '../steps'

export interface OrderSetExportBackgroundInput {
  user_id: string
  transaction_id: string
  channel?: string
  created_at?: Record<string, string> | string
  updated_at?: Record<string, string> | string
  status?: string[] | string
  delivery_type?: string[] | string
  q?: string
  order?: string | Record<string, string>
}

const triggerOrderSetExportStep = createStep(
  'trigger-order-set-export-background',
  async (input: OrderSetExportBackgroundInput, { container }) => {
    const { user_id, transaction_id, channel, ...filters } = input
    const eventBusService = container.resolve(Modules.EVENT_BUS)

    const notificationChannel = channel || 'feed'

    await eventBusService.emit({
      name: 'order-set-export.process-background',
      data: {
        transaction_id,
        user_id,
        filters: filters as OrderSetExportFilters,
        notification: {
          to: user_id,
          channel: notificationChannel,
          template: 'order-set-export-completed',
        },
        redirectNotification: '/order-set',
      },
    })

    return new StepResponse({
      transaction_id,
      status: 'processing',
      message:
        'Order set export started in background. You will be notified when it completes.',
    })
  }
)

export const exportOrderSetsLevelBackgroundWorkflow = createWorkflow(
  'export-order-sets-level-background',
  function (input: OrderSetExportBackgroundInput) {
    const result = triggerOrderSetExportStep(input)
    return new WorkflowResponse(result)
  }
)

