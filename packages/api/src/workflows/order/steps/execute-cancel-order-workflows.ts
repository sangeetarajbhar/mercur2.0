import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { cancelOrderWorkflow } from '../workflows/cancel-order'

export type ExecuteCancelOrderWorkflowsInput = {
  orderIds: string[]
  canceledBy: string
  /** When true, skips rider-assigned validation (e.g. for RTO flow) */
  isRTO?: boolean
}

/**
 * Executes cancelOrderWorkflow for all orders sequentially.
 * Sequential execution ensures that when the last order is cancelled, the subscriber
 * will see all previous orders as cancelled and automatically update the order-set status.
 */
export const executeCancelOrderWorkflowsStep = createStep(
  'execute-cancel-order-workflows',
  async (
    input: ExecuteCancelOrderWorkflowsInput,
    { container }
  ): Promise<StepResponse<void>> => {
    // Get the workflow from the container scope
    const workflow = cancelOrderWorkflow(container)
    
    // Execute all cancel order workflows sequentially
    // This ensures subscribers can reliably detect when all orders are cancelled
    for (const orderId of input.orderIds) {
      await workflow.run({
        input: {
          order_id: orderId,
          canceled_by: input.canceledBy,
          ...(input.isRTO !== undefined && { isRTO: input.isRTO }),
        },
      })
    }
    
    return new StepResponse(void 0)
  }
)

