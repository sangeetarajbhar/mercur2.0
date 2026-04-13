import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createCodPayout } from "../../../modules/customer_refund_methods/utils/razorpay-validation"
import { RAZORPAY_PAYOUT_MODE } from "../../../utils/constants/payments"
import { BankAccountType } from "../../../utils/constants/bank_account_verification"

const REFERENCE_ID_MAX = 40
const NOTES_MAX_KEYS = 15
const NOTES_VALUE_MAX = 256

export const executeCodPayoutStep = createStep(
  "execute-cod-payout",
  async (input: any) => {
    const refundMethod = {
      id: input.returnRefundLink.type_id,
      type: input.returnRefundLink.type as "upi" | "bank",
      account_number: input.customerBankDetail?.masked_account,
      account_holder_name: input.customerBankDetail?.masked_holder,
      ifsc_code: input.customerBankDetail?.ifsc_code,
      upi_id: input.customerUpiDetail?.masked_upi,
    }

    const amountInPaise = Math.round(input.amount * 100)
    const idempotencyKey = `${input.return_id}`
    const queueIfLowBalance = true
    const referenceId =
      input.return_id.length > REFERENCE_ID_MAX
        ? input.return_id.slice(0, REFERENCE_ID_MAX)
        : input.return_id

    const notes: Record<string, string> = {}
    if (input.return_id) notes.return_id = input.return_id.slice(0, NOTES_VALUE_MAX)
    if (input.orderId) notes.order_id = input.orderId.slice(0, NOTES_VALUE_MAX)
    if (input.order_line_item_id)
      notes.order_line_item_id = input.order_line_item_id.slice(0, NOTES_VALUE_MAX)
    if (input.actorId) notes.actor_id = input.actorId
    notes.refund_source = input.refund_source ?? "Refund Processed by CC Team"
    const requestNotes = Object.fromEntries(Object.entries(notes).slice(0, NOTES_MAX_KEYS))

    const payoutResult = await createCodPayout({
      amount: input.amount,
      refundMethod,
      contact: input.contact,
      return_id: input.return_id,
      order_id: input.orderId,
      fund_account_id: input.fund_account_id,
      contact_id: input.contact_id,
      idempotencyKey,
      queueIfLowBalance,
      referenceId,
      requestNotes,
    })

    const payoutMode =
      input.returnRefundLink.type === BankAccountType.UPI
        ? RAZORPAY_PAYOUT_MODE.UPI
        : RAZORPAY_PAYOUT_MODE.IMPS

    return new StepResponse({
      payoutResult,
      payoutMode,
      amountInPaise,
      idempotencyKey,
      referenceId,
      requestNotes,
      queueIfLowBalance,
    })
  }
)

