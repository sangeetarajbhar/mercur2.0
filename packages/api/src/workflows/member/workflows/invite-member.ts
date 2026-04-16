import { WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'

import { CreateMemberInviteDTO } from '../../../types/seller'

import { createMemberInviteStep } from '../steps'

export const inviteMemberWorkflow = createWorkflow(
  'invite-member',
  function (input: CreateMemberInviteDTO) {
    return new WorkflowResponse(createMemberInviteStep(input))
  }
)
