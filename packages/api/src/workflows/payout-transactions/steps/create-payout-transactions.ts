import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PayoutTransactionModuleService from "../../../modules/payout-transactions/service"
import { PAYOUT_TRANSACTIONS_MODULE } from "../../../modules/payout-transactions"

export type CreatePayoutTransactionsStepInput = {
  provider: string
  provider_payout_id: string
  provider_fund_account_id: string
  return_id: string
  order_id: string
  payment_id: string | null
  customer_refund_method_id: string | null
  type: string | null
  type_id: string | null
  reference_id: string | null
  customer_id: string
  customer_name: string | null
  payout_type: string | null
  queue_if_low_balance: boolean
  idempotency_key: string
  amount: number
  currency: string
  payout_mode: string
  purpose: string
  notes: Record<string, unknown> | null
  utr: string | null
  status: string | null
  status_details: Record<string, unknown> | null
  fees: number | null
  tax: number | null
  last_webhook_event: string | null
  last_webhook_at: Date | null
  response_snapshot: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_by: string | null
}

export const createPayoutTransactionsStep = createStep(
  "create-payout-transaction-step",
  async (input: CreatePayoutTransactionsStepInput, { container }) => {
    const service: PayoutTransactionModuleService = container.resolve(PAYOUT_TRANSACTIONS_MODULE)
    const payoutTransaction = await service.createPayoutTransactions(input)
    return new StepResponse(payoutTransaction, payoutTransaction.id)
  },
  async (id: string, { container }) => {
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "payout transaction id is required")
    }
    const service: PayoutTransactionModuleService = container.resolve(PAYOUT_TRANSACTIONS_MODULE)
    await service.softDeletePayoutTransactions(id)
  }
)
