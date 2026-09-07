import Razorpay from 'razorpay'
import axios from 'axios'
import { MedusaError } from '@medusajs/framework/utils'
import { RAZORPAY_PAYOUT_MODE } from '../../../utils/constants/payments'
import { BankAccountType, RazorpayValidationType } from '../../../utils/constants/bank_account_verification'

// ============================================================================
// Razorpay API Configuration
// ============================================================================

/**
 * Razorpay API base URL
 * Can be overridden via RAZORPAY_API_BASE_URL env var (useful for testing/staging)
 */
const RAZORPAY_API_BASE_URL = process.env.RAZORPAY_API_BASE_URL

/**
 * Razorpay API version
 * Defaults to v1, but can be changed to v2 when Razorpay releases it
 * Set via RAZORPAY_API_VERSION env var (e.g., 'v1', 'v2')
 */
const RAZORPAY_API_VERSION = 'v1'

// ============================================================================
// Credentials & Authentication
// ============================================================================

interface RazorpayCredentials {
  keyId: string
  keySecret: string
}

/**
 * Get Razorpay credentials from environment variables
 * @throws MedusaError if credentials are not configured
 */
function getRazorpayCredentials(): RazorpayCredentials {
  const keyId =
    process.env.RAZORPAY_TEST_KEY_ID ?? process.env.RAZORPAY_ID
  const keySecret =
    process.env.RAZORPAY_TEST_KEY_SECRET ?? process.env.RAZORPAY_SECRET

  if (!keyId || !keySecret) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Razorpay credentials not configured. Please set RAZORPAY_ID and RAZORPAY_SECRET environment variables.'
    )
  }

  return { keyId, keySecret }
}

/**
 * Generate Basic Auth header for Razorpay API requests
 * @param credentials - Razorpay credentials
 * @returns Authorization header value
 */
function getRazorpayAuthHeader(credentials: RazorpayCredentials): string {
  const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64')
  return `Basic ${auth}`
}

// ============================================================================
// Razorpay Client Initialization
// ============================================================================

/**
 * Initialize Razorpay client
 * @returns Razorpay client instance
 */
export function initRazorpayClient(): Razorpay {
  const credentials = getRazorpayCredentials()
  return new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret })
}

/**
 * Validate bank account using Razorpay API
 * @param razorpay - Razorpay client instance
 * @param params - Bank account validation parameters
 * @returns Razorpay validation response
 */
export async function validateBankAccount(
  razorpay: Razorpay,
  params: {
    accountNumber: string
    ifscCode: string
    accountHolderName: string
    referenceId: string
    contact: {
      name: string
      email: string
      contact: string
      // reference_id: string;
      type: string
      notes: object
    }
    sourceAccountNumber?: string
    validationType?: 'pennydrop' | 'pennyiless' | 'optimized',
    notes?: object | null
  }
) {
  const requestPayload = {
    source_account_number:
      params.sourceAccountNumber ?? process.env.RAZORPAY_SOURCE_ACCOUNT_NUMBER,
    validation_type: params.validationType ?? RazorpayValidationType.OPTIMIZED,
    reference_id: params.referenceId,
    fund_account: {
      account_type: 'bank_account',
      bank_account: {
        name: params.accountHolderName,
        ifsc: params.ifscCode,
        account_number: params.accountNumber
      },
      contact: {
        name: params.contact.name,
        email: params.contact.email,
        contact: params.contact.contact,
        type: params.contact.type ?? 'customer',
        notes: params.contact.notes
      }
    },
    notes: params.notes,
  }

  try {
    // Use Razorpay's raw API for composite validation
    // Endpoint: POST /v1/fund_accounts/validations
    // Docs: https://razorpay.com/docs/api/x/composite-account-validation/bank-account
    // Note: Razorpay SDK doesn't expose api.post(), so we use axios directly with Basic Auth
    const credentials = getRazorpayCredentials()
    const auth = getRazorpayAuthHeader(credentials)
    // console.log('RAZORPAY_API_BASE_URL: ', RAZORPAY_API_BASE_URL)
    // console.log('RAZORPAY_API_VERSION: ', RAZORPAY_API_VERSION)
    // console.log('getRazorpayAuthHeader: ', auth)
    // console.log('requestPayload: ', requestPayload)
    // console.log('credentials.keyId: ', credentials.keyId)
    // console.log('credentials.keySecret: ', credentials.keySecret)

    const response = await axios.post(
      `${RAZORPAY_API_BASE_URL}/${RAZORPAY_API_VERSION}/fund_accounts/validations`,
      requestPayload,
      {
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data
  } catch (error: any) {
    console.error(
      `Validate Bank Account error for customer ${params.contact.name}, contact ${params.contact.contact}`
    )
    console.error(error)
    const errorMessage =
      error.response?.data?.error?.description ||
      error.response?.data?.error?.message ||
      error.message ||
      'Unknown error'
    throw new Error(`Razorpay bank account validation failed: ${errorMessage}`)
  }
}

/**
 * Validate UPI account using Razorpay API
 * @param razorpay - Razorpay client instance
 * @param params - UPI validation parameters
 * @returns Razorpay validation response
 */
export async function validateUpiAccount(
  razorpay: Razorpay,
  params: {
    upiId: string
    referenceId: string
    contact: {
      name: string
      email: string
      contact: string
      // reference_id: string;
      type: string
      notes: object
    }
    sourceAccountNumber?: string
    validationType?: 'pennydrop' | 'pennyiless' | 'optimized', // @TODO it should always pennydrop, else it won't work
    notes?: object | null
  }
) {
  const requestPayload = {
    source_account_number:
      params.sourceAccountNumber ?? process.env.RAZORPAY_SOURCE_ACCOUNT_NUMBER,
    validation_type: params.validationType ?? RazorpayValidationType.PENNYDROP,
    reference_id: params.referenceId,
    fund_account: {
      account_type: 'vpa',
      vpa: {
        address: params.upiId
      },
      contact: {
        name: params.contact.name,
        email: params.contact.email,
        contact: params.contact.contact,
        type: params.contact.type ?? 'customer',
        notes: params.contact.notes
      }
    },
    notes: params.notes,
  }

  try {
    // Use Razorpay's raw API for composite validation
    // Endpoint: POST /v1/fund_accounts/validations
    // Docs: https://razorpay.com/docs/api/x/composite-account-validation/vpa
    // Note: Razorpay SDK doesn't expose api.post(), so we use axios directly with Basic Auth
    const credentials = getRazorpayCredentials()
    const auth = getRazorpayAuthHeader(credentials)

    // console.log('RAZORPAY_API_BASE_URL: ', RAZORPAY_API_BASE_URL)
    // console.log('RAZORPAY_API_VERSION: ', RAZORPAY_API_VERSION)
    // console.log('requestPayload: ', requestPayload)
    // console.log('credentials.keyId: ', credentials.keyId)
    // console.log('credentials.keySecret: ', credentials.keySecret)

    const response = await axios.post(
      `${RAZORPAY_API_BASE_URL}/${RAZORPAY_API_VERSION}/fund_accounts/validations`,
      requestPayload,
      {
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data
  } catch (error: any) {
    console.error(
      `Validate UPI Account error for customer ${params.contact.name}, contact ${params.contact.contact}`
    )
    console.error(error.response?.data, { depth: null, colors: true })
    const errorMessage =
      error.response?.data?.error?.description ||
      error.response?.data?.error?.message ||
      error.message ||
      'Unknown error'
    throw new Error(`Razorpay UPI validation failed: ${errorMessage}`)
  }
}

/**
 * Create a payout to bank account using Razorpay Composite Payout API
 * Creates Contact + Fund Account + Payout in a single API call.
 * Top-level account_number = merchant source (env or sourceAccountNumber); bank_account.account_number = beneficiary.
 * @param razorpay - Razorpay client instance (unused; kept for API compatibility)
 * @param params - Payout parameters
 * @returns Razorpay payout response
 */
export async function createBankAccountPayout(
  razorpay: Razorpay,
  params: {
    amount: number // Amount in paise (smallest currency unit)
    currency: string // Currency code, e.g., 'INR'
    accountNumber: string
    ifscCode: string
    accountHolderName: string
    contact: {
      name: string
      email: string
      contact: string
      reference_id?: string
      type?: string
    }
    purpose: string // Payout purpose, e.g., 'refund', 'payout'
    fundAccountId?: string // Optional: Use existing fund account ID
    contactId?: string // Optional: Use existing contact ID
    queueIfLowBalance?: boolean // Queue payout if balance is low
    referenceId: string // Unique reference ID for tracking (max 40 chars)
    notes?: Record<string, string> // Additional notes
    /** Merchant's RazorpayX source account (default from env RAZORPAY_X_ACCOUNT_NUMBER / RAZORPAY_SOURCE_ACCOUNT_NUMBER) */
    sourceAccountNumber?: string
    /** Beneficiary bank account number */
    /** NEFT | RTGS | IMPS | UPI (required by Razorpay API) */
    mode?: string
    /** Narration for bank statement (max 30 chars) */
    narration?: string
    /** When set, sends X-Payout-Idempotency */
    idempotencyKey: string
  }
) {
  const sourceAccount = params.sourceAccountNumber ?? process.env.RAZORPAY_SOURCE_ACCOUNT_NUMBER
  if (!sourceAccount?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Merchant source account required. Set RAZORPAY_SOURCE_ACCOUNT_NUMBER.'
    )
  }

  const contactWithType = {
    ...params.contact,
    type: params.contact.type ?? 'customer',
  }

  const requestPayload: Record<string, unknown> = {
    account_number: sourceAccount.trim(),
    fund_account: {
      account_type: 'bank_account',
      bank_account: {
        name: params.accountHolderName,
        ifsc: params.ifscCode,
        account_number: params.accountNumber
      },
      contact: contactWithType,
    },
    amount: params.amount,
    currency: params.currency,
    purpose: params.purpose,
    mode: params.mode ?? 'IMPS',
    queue_if_low_balance: params.queueIfLowBalance ?? true,
  }

  // Use existing fund account if provided
  if (params.fundAccountId) {
    requestPayload.fund_account = { id: params.fundAccountId }
  }

  if (params.referenceId) requestPayload.reference_id = params.referenceId
  if (params.notes) requestPayload.notes = params.notes
  if (params.narration) requestPayload.narration = params.narration.slice(0, 30)

  const credentials = getRazorpayCredentials()
  const headers: Record<string, string> = {
    Authorization: getRazorpayAuthHeader(credentials),
    'Content-Type': 'application/json',
  }
  if (params.idempotencyKey) headers['X-Payout-Idempotency'] = params.idempotencyKey

  try {
    const response = await axios.post(
      `${RAZORPAY_API_BASE_URL}/${RAZORPAY_API_VERSION}/payouts`,
      requestPayload,
      {
        headers,
      }
    )
    return response.data
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { error?: { description?: string; message?: string } } }; message?: string }

    const errorMessage =
      err.response?.data?.error?.description ||
      err.response?.data?.error?.message ||
      err.message ||
      'Unknown error'
    throw new Error(`Razorpay bank account payout failed: ${errorMessage}`)
  }
}

/**
 * Create a payout to UPI/VPA using Razorpay Composite Payout API
 * Creates Contact + Fund Account + Payout in a single API call.
 * Top-level account_number = merchant source (env or sourceAccountNumber); required by Razorpay.
 * @param razorpay - Razorpay client instance (unused; kept for API compatibility)
 * @param params - Payout parameters
 * @returns Razorpay payout response
 */
export async function createUpiPayout(
  razorpay: Razorpay,
  params: {
    amount: number // Amount in paise (smallest currency unit)
    currency: string // Currency code, e.g., 'INR'
    upiId: string // UPI ID/VPA address
    contact: {
      name: string
      email: string
      contact: string
      reference_id?: string
      type?: string
    }
    purpose: string // Payout purpose, e.g., 'refund', 'payout'
    fundAccountId?: string // Optional: Use existing fund account ID
    contactId?: string // Optional: Use existing contact ID
    queueIfLowBalance?: boolean // Queue payout if balance is low
    referenceId: string // Unique reference ID for tracking (max 40 chars)
    notes?: Record<string, string> // Additional notes
    /** Merchant's RazorpayX source account (default from env) */
    sourceAccountNumber?: string
    /** NEFT | RTGS | IMPS | UPI (required by Razorpay API) */
    mode?: string
    /** Narration for bank statement (max 30 chars) */
    narration?: string
    /** When set, sends X-Payout-Idempotency and treats 409 as success */
    idempotencyKey: string
  }
) {
  const sourceAccount = params.sourceAccountNumber ?? process.env.RAZORPAY_SOURCE_ACCOUNT_NUMBER
  if (!sourceAccount?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Merchant source account required. Set RAZORPAY_SOURCE_ACCOUNT_NUMBER.'
    )
  }

  const contactWithType = {
    ...params.contact,
    type: params.contact.type ?? 'customer',
  }

  const requestPayload: Record<string, unknown> = {
    account_number: sourceAccount.trim(),
    fund_account: {
      account_type: 'vpa',
      vpa: { address: params.upiId },
      contact: contactWithType,
    },
    amount: params.amount,
    currency: params.currency,
    purpose: params.purpose,
    queue_if_low_balance: params.queueIfLowBalance ?? true,
    mode: params.mode ?? 'UPI',
  }

  // Use existing fund account if provided
  if (params.fundAccountId) {
    requestPayload.fund_account = { id: params.fundAccountId }
  }

  if (params.referenceId) requestPayload.reference_id = params.referenceId
  if (params.notes) requestPayload.notes = params.notes
  if (params.narration) requestPayload.narration = (params.narration ?? '').slice(0, 30)

  const credentials = getRazorpayCredentials()
  const headers: Record<string, string> = {
    Authorization: getRazorpayAuthHeader(credentials),
    'Content-Type': 'application/json',
  }
  if (params.idempotencyKey) headers['X-Payout-Idempotency'] = params.idempotencyKey

  try {
    const response = await axios.post(
      `${RAZORPAY_API_BASE_URL}/${RAZORPAY_API_VERSION}/payouts`,
      requestPayload,
      {
        headers
      }
    )
    return response.data
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { error?: { description?: string; message?: string } } }; message?: string }

    const errorMessage =
      err.response?.data?.error?.description ||
      err.response?.data?.error?.message ||
      err.message ||
      'Unknown error'
    throw new Error(`Razorpay UPI payout failed: ${errorMessage}`)
  }
}

/**
 * Create a payout using existing Razorpay fund_account_id (e.g. from verification).
 * Used when we already have fund_account_id; no composite payload.
 * @internal Used by createCodPayout when fund_account_id is provided
 */
async function createPayoutByFundAccountId(params: {
  sourceAccountNumber: string
  amount: number
  currency: string
  mode: string
  purpose: string
  fundAccountId: string
  contactId?: string
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
    fund_account_id: params.fundAccountId, // pass fundAccountId only if available
    queue_if_low_balance: params.queueIfLowBalance,
  }
  if (params.referenceId) requestPayload.reference_id = params.referenceId
  if (params.narration) requestPayload.narration = (params.narration ?? '').slice(0, 30)
  if (params.notes) requestPayload.notes = params.notes

  const credentials = getRazorpayCredentials()
  const headers: Record<string, string> = {
    Authorization: getRazorpayAuthHeader(credentials),
    'Content-Type': 'application/json',
  }
  if (params.idempotencyKey) headers['X-Payout-Idempotency'] = params.idempotencyKey

  console.log('createPayoutByFundAccountId: requestPayload headers: ', params.idempotencyKey)
  console.log('createPayoutByFundAccountId: requestPayload: ')
  console.dir(requestPayload, { depth: null, colors: true })

  try {
  const response = await axios.post(
    `${RAZORPAY_API_BASE_URL}/${RAZORPAY_API_VERSION}/payouts`,
    requestPayload,
    {
      headers
    }
  )

  return response.data as Record<string, unknown>
  } catch (error: any) {
    console.log('razorpay payout errors: ', error)
    const errorMessage =
      error.response?.data?.error?.description ||
      error.response?.data?.error?.message ||
      error.message ||
      'Unknown error'
    throw new Error(`Failed to do Razorpay payout: ${errorMessage}`)
  }
}

/**
 * Fetch payout status by payout ID
 * @param razorpay - Razorpay client instance
 * @param payoutId - Razorpay payout ID
 * @returns Payout details
 */
export async function fetchPayoutStatus(razorpay: Razorpay, payoutId: string) {
  try {
    // Use Razorpay's raw API to fetch payout
    // Endpoint: GET /v1/payouts/:payoutId
    // Note: Razorpay SDK doesn't expose api.get(), so we use axios directly with Basic Auth
    const credentials = getRazorpayCredentials()
    const response = await axios.get(
      `${RAZORPAY_API_BASE_URL}/${RAZORPAY_API_VERSION}/payouts/${payoutId}`,
      {
        headers: {
          'Authorization': getRazorpayAuthHeader(credentials),
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error?.description ||
      error.response?.data?.error?.message ||
      error.message ||
      'Unknown error'
    throw new Error(`Failed to fetch Razorpay payout: ${errorMessage}`)
  }
}

// ============================================================================
// COD Razorpay Payout (same credentials as validation; idempotency)
// ============================================================================

export interface CreateCodPayoutContact {
  name: string
  email: string
  phone: string
}

/** Decrypted refund method from CustomerRefundMethodModuleService.decryptRefundMethod */
export interface DecryptedRefundMethodForPayout {
  id: string
  type: 'bank' | 'upi'
  account_number?: string
  account_holder_name?: string
  ifsc_code?: string
  upi_id?: string
}

export interface CreateCodPayoutOptions {
  amount: number
  refundMethod: DecryptedRefundMethodForPayout
  contact: CreateCodPayoutContact
  return_id: string
  order_id: string
  fund_account_id: string
  contact_id: string
  idempotencyKey: string
  queueIfLowBalance: boolean
  referenceId: string
  requestNotes: Record<string, string>
}

export interface CreateCodPayoutResult {
  payout_id: string
  entity: string
  fund_account_id: string
  amount: number
  currency: string
  notes: Record<string, unknown>
  fees?: number
  tax?: number
  status: string
  utr?: string | null
  mode: string
  purpose: string
  reference_id: string
  narration?: string
  batch_id?: string | null
  created_at: number
  status_details?: { description?: string; source?: string; reason?: string } | null
}


/** Normalize raw Razorpay payout response to CreateCodPayoutResult */
function toCreateCodPayoutResult(data: Record<string, unknown>): CreateCodPayoutResult {
  const result: CreateCodPayoutResult = {
    payout_id: data.id as string,
    entity: data.entity as string,
    fund_account_id: data.fund_account_id as string,
    amount: data.amount as number,
    currency: data.currency as string,
    notes: data.notes as Record<string, unknown>,
    fees: data.fees as number,
    tax: data.tax as number,
    status: data.status as string,
    utr: data.utr as string | null,
    mode: data.mode as string,
    purpose: data.purpose as string,
    reference_id: data.reference_id as string,
    narration: data.narration as string,
    batch_id: data.batch_id as string | null,
    status_details: data.status_details as CreateCodPayoutResult['status_details'],
    created_at: data.created_at as number,
  }

  return result
}

/**
 * Create a COD payout via Razorpay Payout API.
 * Reuses createBankAccountPayout, createUpiPayout, or createPayoutByFundAccountId;
 * sends X-Payout-Idempotency;
 */
export async function createCodPayout(options: CreateCodPayoutOptions): Promise<CreateCodPayoutResult> {
  const {
    amount,
    refundMethod,
    contact,
    return_id,
    order_id,
    fund_account_id,
    contact_id,
    idempotencyKey,
    queueIfLowBalance,
    referenceId,
    requestNotes,
  } = options

  const sourceAccount = process.env.RAZORPAY_SOURCE_ACCOUNT_NUMBER
  if (!sourceAccount?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'RAZORPAY_SOURCE_ACCOUNT_NUMBER is required for Razorpay Payout.'
    )
  }

  const amountInPaise = Math.round(amount * 100)
  if (amountInPaise < 100) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Payout amount must be at least 100 paise (₹1), current amount in paise is: ${amountInPaise}`
    )
  }

  if (!idempotencyKey) {
    console.error(`Idempotency Key is required for returnId: ${return_id}, orderId: ${order_id}, fund_account_id:${fund_account_id}`)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `idempotencyKey is required for payouts`
    )
  }

  const mode = refundMethod.type === BankAccountType.UPI ? RAZORPAY_PAYOUT_MODE.UPI : RAZORPAY_PAYOUT_MODE.IMPS
  const narration = 'REFUND' // This will display in customer bank statement, 9 characters only rest it will ignore by bank

  const raw = await createPayoutByFundAccountId({
    sourceAccountNumber: sourceAccount.trim(),
    amount: amountInPaise,
    currency: 'INR',
    mode,
    purpose: 'refund',
    fundAccountId: fund_account_id.trim(),
    contactId: contact_id.trim(),
    referenceId,
    narration,
    notes: requestNotes,
    queueIfLowBalance: queueIfLowBalance ?? true,
    idempotencyKey,
  })

  return toCreateCodPayoutResult(raw)
}

/**
 * Fetch payout by ID (Razorpay "Fetch Payout With ID" API).
 * Uses credentials from env (getRazorpayCredentials); no Razorpay client needed.
 * @param payoutId - Razorpay payout ID (e.g. pout_xxxx)
 * @returns Payout entity (id, status, utr, fees, tax, status_details, ...)
 * @see https://razorpay.com/docs/api/x/payouts/fetch-with-id
 */
export async function fetchPayoutById(
  payoutId: string
): Promise<Record<string, unknown>> {
  const credentials = getRazorpayCredentials()
  const auth = getRazorpayAuthHeader(credentials)
  try {
    const response = await axios.get<Record<string, unknown>>(
      `${RAZORPAY_API_BASE_URL}/${RAZORPAY_API_VERSION}/payouts/${encodeURIComponent(payoutId)}`,
      {
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: { description?: string; message?: string } } }; message?: string }
    const errorMessage =
      err.response?.data?.error?.description ||
      err.response?.data?.error?.message ||
      err.message ||
      'Unknown error'
    throw new Error(`Failed to fetch Razorpay payout: ${errorMessage}`)
  }
}
