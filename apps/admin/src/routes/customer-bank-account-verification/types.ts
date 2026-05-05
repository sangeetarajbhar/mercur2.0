export interface CustomerBankAccountVerification {
  id: string;
  customer_refund_method_id: string | null;
  fav_id: string | null;
  customer_id: string | null;
  reference_id: string | null;
  utr: string | null;
  fund_account_id: string | null;
  contact_id: string | null;
  registered_name: string | null;
  bank_account_status: string | null;
  status: string | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}
