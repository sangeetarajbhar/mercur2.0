import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260216124749 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "customer_bank_detail" ("id" text not null, "verified_by" text not null, "customer_bank_account_verification_id" text null, "account_number_enc" text not null, "account_number_hmac" text not null, "account_holder_enc" text not null, "ifsc_code" text not null, "masked_account" text not null, "masked_holder" text not null, "bank_name" text null, "status" text not null default 'inactive', "metadata" jsonb null, "created_by" text not null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_bank_detail_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_bank_detail_deleted_at" ON "customer_bank_detail" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_bank_detail_customer_bank_account_verification_id" ON "customer_bank_detail" ("customer_bank_account_verification_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_bank_detail_status" ON "customer_bank_detail" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_bank_detail_account_number_hmac" ON "customer_bank_detail" ("account_number_hmac") WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_bank_detail" cascade;`)
  }
}
