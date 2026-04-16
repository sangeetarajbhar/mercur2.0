import { createWorkflow } from '@medusajs/framework/workflows-sdk'

import { deleteMemberInvitesStep } from '../steps'

export const deleteMemberInvitesWorkflow = createWorkflow(
  'delete-member-invite',
  function (id: string) {
    deleteMemberInvitesStep(id)
  }
)
