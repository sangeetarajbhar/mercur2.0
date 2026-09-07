import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'

import { deleteWishlistEntryWorkflow } from '../../../../../workflows/wishlist/workflows'

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  await deleteWishlistEntryWorkflow.run({
    container: req.scope,
    input: { ...req.params, customer_id: req.auth_context.actor_id }
  })

  res.json({
    ...req.params,
    object: 'wishlist',
    deleted: true
  })
}

