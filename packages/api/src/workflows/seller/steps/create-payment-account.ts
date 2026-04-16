// import { MedusaError } from '@medusajs/framework/utils'
// import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

// import { CreatePayoutAccountDTO } from '@mercurjs/framework'
// import { PAYOUT_MODULE } from '@mercurjs/payout'
// import { PayoutModuleService } from '@mercurjs/payout'

// export const createPayoutAccountStep = createStep(
//   'create-payout-account',
//   async (input: CreatePayoutAccountDTO, { container }) => {
//     const service = container.resolve<PayoutModuleService>(PAYOUT_MODULE)

//     const payoutAccount = await service.createPayoutAccount(input)

//     return new StepResponse(payoutAccount, payoutAccount.id)
//   },
//   async (id: string, { container }) => {
//     if (!id) {
//       throw new MedusaError(
//         MedusaError.Types.INVALID_DATA,
//         'Payout account ID is required for compensation'
//       )
//     }

//     const service = container.resolve<PayoutModuleService>(PAYOUT_MODULE)

//     await service.softDeletePayoutAccounts(id)
//   }
// )
