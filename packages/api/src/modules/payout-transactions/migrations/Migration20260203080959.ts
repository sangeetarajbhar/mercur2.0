import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260203080959 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "payout_transactions" ("id" text not null, "provider" text not null, "provider_payout_id" text not null, "provider_fund_account_id" text null, "return_id" text not null, "order_id" text not null, "payment_id" text null, "customer_refund_method_id" text null, "reference_id" text null, "customer_id" text not null, "customer_name" text null, "payout_type" text null, "queue_if_low_balance" boolean null, "idempotency_key" text not null, "amount" numeric not null, "currency" text null, "payout_mode" text not null, "purpose" text null, "notes" jsonb null, "utr" text null, "status" text null, "status_details" jsonb null, "fees" numeric null, "tax" numeric null, "last_webhook_event" text null, "last_webhook_at" timestamptz null, "response_snapshot" jsonb null, "metadata" jsonb null, "created_by" text null, "raw_amount" jsonb not null, "raw_fees" jsonb null, "raw_tax" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payout_transactions_pkey" primary key ("id"));`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payout_transactions_provider_payout_id" ON "payout_transactions" ("provider_payout_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payout_transactions_return_id" ON "payout_transactions" ("return_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payout_transactions_order_id" ON "payout_transactions" ("order_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payout_transactions_customer_id" ON "payout_transactions" ("customer_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payout_transactions_deleted_at" ON "payout_transactions" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payout_transactions" cascade;`)
  }
}
