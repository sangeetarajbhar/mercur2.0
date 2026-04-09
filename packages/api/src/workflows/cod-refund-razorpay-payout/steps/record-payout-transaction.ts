import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createPayoutTransactionsWorkflow } from "../../payout-transactions/workflows"
import { RAZORPAY_PAYMENT_PROVIDER } from "../../../utils/constants/payments"
import { MedusaError } from "@medusajs/framework/utils"

export const recordPayoutTransactionStep = createStep(
  "record-payout-transaction-for-cod",
  async (input: any, { container }) => {
    const { payoutResult } = input
    if (!payoutResult?.payout_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Payout Id is required to do Payout for returnId: ${input.return_id}`
      )
    }

    const transactionInput = {
      provider: RAZORPAY_PAYMENT_PROVIDER,
      provider_payout_id: payoutResult.payout_id,
      provider_fund_account_id: payoutResult.fund_account_id,
      return_id: input.return_id,
      order_id: input.orderId,
      payment_id: null as string | null,
      customer_refund_method_id: null as string | null,
      type: input.type,
      type_id: input.returnRefundLinkTypeId,
      reference_id: input.referenceId,
      customer_id: input.customerId,
      customer_name: input.customerName,
      payout_type: "cod_refund",
      queue_if_low_balance: input.queueIfLowBalance,
      idempotency_key: input.idempotencyKey,
      amount: input.amountInPaise,
      currency: "INR",
      payout_mode: input.payoutMode,
      purpose: "refund",
      notes: input.requestNotes as Record<string, unknown>,
      utr: payoutResult.utr ?? null,
      status: payoutResult.status,
      status_details: (payoutResult.status_details ?? null) as Record<string, unknown> | null,
      fees: payoutResult.fees ?? null,
      tax: payoutResult.tax ?? null,
      last_webhook_event: null as string | null,
      last_webhook_at: null as Date | null,
      request_notes: input.requestNotes as Record<string, unknown>,
      response_snapshot: payoutResult as unknown as Record<string, unknown>,
      metadata: null as Record<string, unknown> | null,
      created_by: input.created_by,
    }

    await createPayoutTransactionsWorkflow(container).run({ input: transactionInput as any })
    return new StepResponse({ recorded: true })
  }
)

