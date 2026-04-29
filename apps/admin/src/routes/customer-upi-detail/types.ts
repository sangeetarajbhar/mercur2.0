export interface CustomerUpiDetail {
  id: string
  verified_by: string
  customer_bank_account_verification_id: string | null
  /** Decrypted UPI ID (from upi_id_enc), only in retrieve response */
  upi_id?: string | null
  masked_upi: string | null
  status: string | null
  metadata?: Record<string, unknown> | null
  created_by?: string | null
  updated_by?: string | null
  created_at: Date
  updated_at: Date
}

/** Row for mapped customers (customer_payment_preferences + customer first_name, email, phone) */
export interface MappedCustomerRow {
  id: string
  customer_id: string
  first_name: string | null
  email: string | null
  phone: string | null
}

/** From customer_bank_account_verification table (retrieve response only) */
export interface CustomerBankAccountVerification {
  id: string
  customer_refund_method_id: string | null
  customer_id: string | null
  gateway_id: string | null
  reference_id: string | null
  status: string
  bank_account_status: string | null
  utr: string | null
  fav_id: string | null
  fund_account_id: string | null
  contact_id: string | null
  registered_name: string | null
  failure_reason: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  updated_by: string | null
  created_at?: Date | string
  updated_at?: Date | string
}
