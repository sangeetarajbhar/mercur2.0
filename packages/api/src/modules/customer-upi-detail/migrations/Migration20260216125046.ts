import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260216125046 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "customer_upi_detail" ("id" text not null, "verified_by" text not null, "customer_bank_account_verification_id" text null, "upi_id_enc" text not null, "upi_id_hmac" text not null, "masked_upi" text not null, "status" text not null default 'inactive', "metadata" jsonb null, "created_by" text not null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_upi_detail_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_upi_detail_deleted_at" ON "customer_upi_detail" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_upi_detail_customer_bank_account_verification_id" ON "customer_upi_detail" ("customer_bank_account_verification_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_upi_detail_status" ON "customer_upi_detail" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_upi_detail_upi_id_hmac" ON "customer_upi_detail" ("upi_id_hmac") WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_upi_detail" cascade;`)
  }
}
