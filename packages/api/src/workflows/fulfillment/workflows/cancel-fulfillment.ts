import { WorkflowData, WorkflowResponse, createWorkflow, transform } from '@medusajs/framework/workflows-sdk'
import { cancelFulfillmentWorkflow as cancelFulfillmentWorkflowCore } from '@medusajs/medusa/core-flows'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'
import { clearShippedAtStep } from '../steps/cancel-fulfillment'

type CancelFulfillmentWorkflowInput = {
  id: string
  fields?: string[]
}

type CancelFulfillmentWorkflowOutput = {
  fulfillment: any
}

export const cancelFulfillmentWorkflowId = 'cancel-fulfillment'

/**
 * This workflow cancels a fulfillment. If the fulfillment has been shipped,
 * it first clears the shipped_at field before canceling.
 * 
 * @example
 * const { result } = await cancelFulfillmentWorkflow(container).run({
 *   input: {
 *     id: 'ful_123',
 *     fields: ['id', 'status', 'shipped_at']
 *   }
 * })
 */
export const cancelFulfillmentWorkflow = createWorkflow(
  cancelFulfillmentWorkflowId,
  (input: WorkflowData<CancelFulfillmentWorkflowInput>): WorkflowResponse<CancelFulfillmentWorkflowOutput> => {
    // Fetch the fulfillment to check if it has been shipped
    const fulfillmentQuery = useQueryGraphStep({
      entity: 'fulfillments',
      fields: ['id', 'shipped_at'],
      filters: {
        id: input.id,
      },
    })

    // Clear shipped_at if the fulfillment has been shipped
    const cleared = clearShippedAtStep(
      transform({ fulfillmentQuery: fulfillmentQuery as any, fulfillmentId: input.id }, ({ fulfillmentQuery, fulfillmentId }) => {
        const fulfillment = Array.isArray(fulfillmentQuery) ? fulfillmentQuery[0] : fulfillmentQuery
        return {
          fulfillment_id: fulfillmentId,
          fulfillment: fulfillment.data[0] || {},
        }
      })
    )

    // Cancel the fulfillment using the core workflow
    cancelFulfillmentWorkflowCore.runAsStep({
      input: { id: input.id },
    })

    // Refetch the fulfillment with the requested fields
    const fulfillmentResult = useQueryGraphStep({
      entity: 'fulfillments',
      fields: input.fields || ['*'],
      filters: {
        id: input.id,
      },
    }).config({ name: "fetch-customers" })

    return new WorkflowResponse(
      transform({ fulfillmentResult: fulfillmentResult as any }, ({ fulfillmentResult }) => {
        const fulfillment = Array.isArray(fulfillmentResult) ? fulfillmentResult[0] : fulfillmentResult
        return { fulfillment }
      })
    )
  }
)

