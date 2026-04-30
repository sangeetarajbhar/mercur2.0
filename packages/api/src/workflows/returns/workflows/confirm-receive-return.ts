import { createWorkflow, WorkflowResponse, transform } from '@medusajs/framework/workflows-sdk'
import { confirmReturnReceiveWorkflow } from '../../order/workflows/return/confirm-receive-return-request'
import { updateLineItemStatusToReturnedStep } from '../steps'
import { useRemoteQueryStep } from '../../common/steps'

export interface ConfirmReceiveReturnWorkflowInput {
  return_id: string
  confirmed_by: string
  filterableFields?: any
  queryConfigFields?: string[]
}

export interface ConfirmReceiveReturnWorkflowOutput {
  order_preview: any
  return: any
}

export const confirmReceiveReturnWorkflow = createWorkflow(
  'confirm-receive-return',
  (input: ConfirmReceiveReturnWorkflowInput) => {
    // Step 1: Confirm return receive
    const orderPreview = confirmReturnReceiveWorkflow.runAsStep({
      input: {
        return_id: input.return_id,
        confirmed_by: input.confirmed_by,
      },
    })

    // Step 2: Query return using remoteQuery
    const orderReturn = useRemoteQueryStep({
      entry_point: "return",
      fields: input.queryConfigFields || ['id', 'status', 'order_id', 'display_id'],
      variables: {
        id: input.return_id,
        filters: {
          ...input.filterableFields,
        },
      },
      list: false,
    })

    // Step 3: Update line item status to RETURNED
    updateLineItemStatusToReturnedStep({
      return_id: input.return_id
    })

    return new WorkflowResponse({
      order_preview: orderPreview,
      return: orderReturn
    })
  }
)

