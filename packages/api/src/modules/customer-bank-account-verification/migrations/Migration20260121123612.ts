import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260121123612 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "customer_bank_account_verification" ("id" text not null, "customer_refund_method_id" text null, "customer_id" text null, "gateway_id" text null, "reference_id" text null, "status" text check ("status" in ('created', 'completed', 'failed')) not null, "bank_account_status" text null, "utr" text null, "fund_account_id" text null, "contact_id" text null, "registered_name" text null, "failure_reason" text null, "raw_gateway_response_enc" text null, "metadata" jsonb null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_bank_account_verification_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_bank_account_verification_deleted_at" ON "customer_bank_account_verification" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `drop table if exists "customer_bank_account_verification" cascade;`
    )
  }
}
