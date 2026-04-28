import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'

import  { MARKETPLACE_MODULE }  from '../../../../../modules/marketplace'
import MarketplaceModuleService from '../../../../../modules/marketplace/service'
import { AdminUpdateTrackingType } from './validators'
// Dummy commit comment
export const PATCH = async (
  req: AuthenticatedMedusaRequest<AdminUpdateTrackingType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { tracking_id, courier_code } = req.validatedBody

  const marketplaceService = req.scope.resolve(MARKETPLACE_MODULE) as MarketplaceModuleService

  const [orderSet] = await marketplaceService.listOrderSets({ id })

  if (!orderSet) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Order set not found')
  }

  // Check if tracking_id and courier_code combination already exists
  const [existingOrderSet] = await marketplaceService.listOrderSets({
    tracking_id,
    courier_code
  })

  if (existingOrderSet && existingOrderSet.id !== id) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Tracking ID "${tracking_id}" with courier code "${courier_code}" already exists for another order set`
    )
  }

  await marketplaceService.updateOrderSets({
    id,
    tracking_id,
    courier_code
  })

  res.json({ message: 'Tracking details added successfully' })
}
