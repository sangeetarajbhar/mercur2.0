export interface CustomerBankDetail {
  id: string;
  verified_by: string;
  customer_bank_account_verification_id: string | null;
  account_number?: string | null;
  account_holder_name?: string | null;
  ifsc_code: string | null;
  masked_account: string | null;
  masked_holder: string | null;
  bank_name?: string | null;
  status: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CustomerBankAccountVerification {
  id: string;
  customer_refund_method_id: string | null;
  customer_id: string | null;
  gateway_id: string | null;
  reference_id: string | null;
  status: string;
  bank_account_status: string | null;
  utr: string | null;
  fav_id: string | null;
  fund_account_id: string | null;
  contact_id: string | null;
  registered_name: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface MappedCustomerRow {
  id: string;
  customer_id: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
}
