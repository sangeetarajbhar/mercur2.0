import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { cancelOrderSetWorkflow } from '../workflows/cancel-order-set'

export type ExecuteCancelOrderSetWorkflowsInput = {
  orderSetIds: string[]
  canceledBy: string
}

/**
 * Executes cancelOrderSetWorkflow for all order-sets in parallel.
 * Used by cancelOrderGroupWorkflow to cancel every order-set inside an order-group concurrently.
 */
export const executeCancelOrderSetWorkflowsStep = createStep(
  'execute-cancel-order-set-workflows',
  async (
    input: ExecuteCancelOrderSetWorkflowsInput,
    { container }
  ): Promise<StepResponse<void>> => {
    const workflow = cancelOrderSetWorkflow(container)

    await Promise.all(
      input.orderSetIds.map((orderSetId) =>
        workflow.run({
          input: {
            order_set_id: orderSetId,
            canceled_by: input.canceledBy,
          },
        })
      )
    )

    return new StepResponse(void 0)
  }
)
