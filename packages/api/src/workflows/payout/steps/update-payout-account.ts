import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { PayoutAccountDTO, UpdatePayoutAccountDTO } from '@mercurjs/types'
import { MercurModules } from '@mercurjs/types'
import  PAYOUT_MODULE  from '@mercurjs/core-plugin/modules/payout'

export const updatePayoutAccountStep = createStep(
  'update-payout-account',
  async (input: UpdatePayoutAccountDTO, { container }) => {
    const service = container.resolve(MercurModules.PAYOUT)

    const previousData = await service.retrievePayoutAccount(input.id)

    const updatedAccount: PayoutAccountDTO =
      await service.updatePayoutAccounts(input)

    return new StepResponse(updatedAccount, previousData)
  },
  async (previousData: PayoutAccountDTO, { container }) => {
    const service = container.resolve(MercurModules.PAYOUT)

    await service.updatePayoutAccounts(previousData)
  }
)
