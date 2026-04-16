import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import sellerPayoutAccountLink from '@mercurjs/core-plugin/links/seller-payout-account-link'

export const validatePayoutAccountExistsForSellerStep = createStep(
  'validate-payout-account-exists-for-seller',
  async (sellerId: string, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [sellerPayoutAccountRelations]
    } = await query.graph({
      entity: sellerPayoutAccountLink.entryPoint,
      fields: ['id', 'payout_account_id'],
      filters: { seller_id: sellerId }
    })

    if (!sellerPayoutAccountRelations) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        'No payment account exists for seller'
      )
    }

    return new StepResponse({
      id: sellerPayoutAccountRelations.payout_account_id
    })
  }
)
