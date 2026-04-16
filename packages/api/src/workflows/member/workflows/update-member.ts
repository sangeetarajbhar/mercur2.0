import { WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'

import { UpdateMemberDTO } from '../../../types/seller'

import { updateMemberStep } from '../steps'

export const updateMemberWorkflow = createWorkflow(
  'update-member',
  function (input: UpdateMemberDTO) {
    return new WorkflowResponse(updateMemberStep(input))
  }
)
