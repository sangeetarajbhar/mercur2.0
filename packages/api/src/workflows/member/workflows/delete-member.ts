import { createWorkflow } from '@medusajs/framework/workflows-sdk'

import { deleteMemberStep } from '../steps'

export const deleteMemberWorkflow = createWorkflow(
  'delete-member',
  function (id: string) {
    deleteMemberStep(id)
  }
)
