import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { PAYOUT_TRANSACTIONS_MODULE } from "../../../modules/payout-transactions"
import PayoutTransactionModuleService from "../../../modules/payout-transactions/service"

export type CheckExistingPayoutForReturnStepInput = {
  return_id: string
}

export const checkExistingPayoutForReturnStep = createStep(
  "check-existing-payout-for-return",
  async (input: CheckExistingPayoutForReturnStepInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const payoutTransactionsService =
      container.resolve<PayoutTransactionModuleService>(PAYOUT_TRANSACTIONS_MODULE)

    const existing = await payoutTransactionsService.listPayoutTransactions(
      { return_id: input.return_id },
      { take: 1, select: ["id"] } as any
    )

    const skipPayout = Array.isArray(existing) && existing.length > 0
    if (skipPayout) {
      logger.info(
        `[check-existing-payout-for-return] return_id already has payout_transaction, skipping payout: ${JSON.stringify(
          { return_id: input.return_id, payout_id: existing[0].id }
        )}`
      )
    }

    return new StepResponse({ skipPayout })
  }
)

