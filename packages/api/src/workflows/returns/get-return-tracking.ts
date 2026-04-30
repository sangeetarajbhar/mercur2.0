import {
  createWorkflow,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'
import { getReturnTrackingStep } from './steps/get-return-tracking'

interface GetReturnTrackingWorkflowInput {
  return_id: string
}

export const getReturnTrackingWorkflow = createWorkflow(
  'get-return-tracking',
  (input: GetReturnTrackingWorkflowInput) => {
    const stepResult = getReturnTrackingStep(input)

    return new WorkflowResponse({
      return_id: input.return_id,
      track: stepResult.track,
    })
  }
)

