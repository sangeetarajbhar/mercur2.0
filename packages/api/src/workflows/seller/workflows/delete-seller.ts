import { createWorkflow } from '@medusajs/framework/workflows-sdk'

import { deleteSellerStep } from '../steps'

export const deleteSellerWorkflow = createWorkflow(
  'delete-seller',
  function (id: string) {
    deleteSellerStep(id)
  }
)
