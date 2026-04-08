import axios from "axios"
import { MedusaError } from "@medusajs/framework/utils"
import { RAZORPAY_PAYOUT_MODE } from "../../../utils/constants/payments"
import { BankAccountType } from "../../../utils/constants/bank_account_verification"

const RAZORPAY_API_BASE_URL = process.env.RAZORPAY_API_BASE_URL
const RAZORPAY_API_VERSION = "v1"

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_TEST_KEY_ID ?? process.env.RAZORPAY_ID
  const keySecret = process.env.RAZORPAY_TEST_KEY_SECRET ?? process.env.RAZORPAY_SECRET
  if (!keyId || !keySecret) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Razorpay credentials not configured. Please set RAZORPAY_ID and RAZORPAY_SECRET."
    )
  }
  return { keyId, keySecret }
}

function getRazorpayAuthHeader(): string {
  const credentials = getRazorpayCredentials()
  const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString("base64")
  return `Basic ${auth}`
}

async function createPayoutByFundAccountId(params: {
  sourceAccountNumber: string
  amount: number
  currency: string
  mode: string
  purpose: string
  fundAccountId: string
  referenceId?: string
  narration?: string
  notes?: Record<string, unknown>
  queueIfLowBalance: boolean
  idempotencyKey: string
}): Promise<Record<string, unknown>> {
  const requestPayload: Record<string, unknown> = {
    account_number: params.sourceAccountNumber.trim(),
    amount: params.amount,
    currency: params.currency,
    mode: params.mode,
    purpose: params.purpose,
    fund_account_id: params.fundAccountId,
    queue_if_low_balance: params.queueIfLowBalance,
  }
  if (params.referenceId) requestPayload.reference_id = params.referenceId
  if (params.narration) requestPayload.narration = params.narration.slice(0, 30)
  if (params.notes) requestPayload.notes = params.notes

  const headers: Record<string, string> = {
    Authorization: getRazorpayAuthHeader(),
    "Content-Type": "application/json",
  }
  if (params.idempotencyKey) headers["X-Payout-Idempotency"] = params.idempotencyKey

  const response = await axios.post(
    `${RAZORPAY_API_BASE_URL}/${RAZORPAY_API_VERSION}/payouts`,
    requestPayload,
    { headers }
  )
  return response.data as Record<string, unknown>
}

export interface CreateCodPayoutResult {
  payout_id: string
  fund_account_id: string
  amount: number
  currency: string
  notes: Record<string, unknown>
  status: string
  utr?: string | null
  mode: string
  reference_id: string
  fees?: number
  tax?: number
  status_details?: Record<string, unknown> | null
}

function toCreateCodPayoutResult(data: Record<string, unknown>): CreateCodPayoutResult {
  return {
    payout_id: data.id as string,
    fund_account_id: data.fund_account_id as string,
    amount: data.amount as number,
    currency: data.currency as string,
    notes: (data.notes as Record<string, unknown>) ?? {},
    status: data.status as string,
    utr: (data.utr as string) ?? null,
    mode: data.mode as string,
    reference_id: data.reference_id as string,
    fees: data.fees as number,
    tax: data.tax as number,
    status_details: (data.status_details as Record<string, unknown>) ?? null,
  }
}

export async function createCodPayout(options: {
  amount: number
  refundMethod: { type: "bank" | "upi" }
  return_id: string
  order_id: string
  fund_account_id: string
  contact_id: string
  idempotencyKey: string
  queueIfLowBalance: boolean
  referenceId: string
  requestNotes: Record<string, string>
  contact: { name: string; email: string; phone: string }
}): Promise<CreateCodPayoutResult> {
  const sourceAccount = process.env.RAZORPAY_SOURCE_ACCOUNT_NUMBER
  if (!sourceAccount?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "RAZORPAY_SOURCE_ACCOUNT_NUMBER is required for Razorpay Payout."
    )
  }

  const amountInPaise = Math.round(options.amount * 100)
  const mode =
    options.refundMethod.type === BankAccountType.UPI
      ? RAZORPAY_PAYOUT_MODE.UPI
      : RAZORPAY_PAYOUT_MODE.IMPS

  const raw = await createPayoutByFundAccountId({
    sourceAccountNumber: sourceAccount.trim(),
    amount: amountInPaise,
    currency: "INR",
    mode,
    purpose: "refund",
    fundAccountId: options.fund_account_id.trim(),
    referenceId: options.referenceId,
    narration: "REFUND",
    notes: options.requestNotes,
    queueIfLowBalance: options.queueIfLowBalance ?? true,
    idempotencyKey: options.idempotencyKey,
  })

  return toCreateCodPayoutResult(raw)
}

