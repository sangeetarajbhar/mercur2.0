export interface RefundMethod {
  id: string
  customer_id: string
  order_id?: string | null
  return_id?: string | null
  type: "bank" | "upi"
  masked_account?: string | null
  masked_upi?: string | null
  masked_holder?: string | null
  ifsc_code?: string | null
  is_default?: boolean
  status?: boolean
  is_account_verified?: boolean
  bank_account_verification?: {
    fav_id?: string | null
    fund_account_id?: string | null
    contact_id?: string | null
    registered_name?: string | null
    status?: string | null
    bank_account_status?: string | null
    utr?: string | null
  } | null
  created_at: string
  updated_at: string
}
