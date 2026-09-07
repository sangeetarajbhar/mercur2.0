import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251107122714 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "customer_refund_method" ("id" text not null, "customer_id" text not null, "order_id" text null, "return_id" text null, "type" text check ("type" in ('bank', 'upi')) not null, "account_number_enc" text null, "account_number_hmac" text null, "account_holder_enc" text null, "ifsc_code" text null, "upi_id_enc" text null, "upi_id_hmac" text null, "masked_account" text null, "masked_upi" text null, "masked_holder" text null, "is_default" boolean not null default false, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_refund_method_pkey" primary key ("id"));`
    )
  }
  async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_refund_method" cascade;`)
  }
}
