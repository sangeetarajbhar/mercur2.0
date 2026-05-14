export interface PayoutTransactions {
  id: string;

  provider: string;
  provider_payout_id: string | null;
  provider_fund_account_id: string | null;

  return_id: string | null;
  order_id: string | null;
  customer_refund_method_id: string | null;

  reference_id: string | null;

  customer_id: string;
  customer_name: string | null;

  payout_type: string;
  queue_if_low_balance: boolean;

  idempotency_key: string | null;

  amount: number;
  currency: string;

  payout_mode: string;
  purpose: string | null;

  notes: Record<string, unknown> | null;

  utr: string | null;

  status: string;
  status_details: Record<string, unknown> | null;

  fees: number | null;
  tax: number | null;

  last_webhook_event: string | null;
  last_webhook_at: Date | null;

  response_snapshot: Record<string, unknown> | null;

  metadata?: Record<string, unknown> | null;

  created_by: string | null;

  created_at: Date;
  updated_at: Date;

  type: string | null;
  type_id: string | null;
}
