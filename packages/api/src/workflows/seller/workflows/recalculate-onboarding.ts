import { WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'

import { recalculateOnboardingStep } from '../steps'

export const recalculateOnboardingWorkflow = createWorkflow(
  'recalculate-onboarding',
  function (seller_id: string) {
    return new WorkflowResponse(recalculateOnboardingStep(seller_id))
  }
)
