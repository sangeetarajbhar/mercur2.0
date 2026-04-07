import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251015092740 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "cart_order_extra_charge" ("id" text not null, "extra_charge_id" text not null, "extra_charge_rule_id" text null, "cart_id" text not null, "order_set_id" text null, "customer_id" text not null, "name" text null, "original_amount" numeric not null, "fee_amount" numeric not null, "tax_total" numeric not null, "shipping_total" numeric not null, "discount_total" numeric not null, "total_amount" numeric not null, "description" text null, "metadata" jsonb null, "status" integer not null default 1, "raw_original_amount" jsonb not null, "raw_fee_amount" jsonb not null, "raw_tax_total" jsonb not null, "raw_shipping_total" jsonb not null, "raw_discount_total" jsonb not null, "raw_total_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cart_order_extra_charge_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cart_order_extra_charge_cart_id" ON "cart_order_extra_charge" (cart_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cart_order_extra_charge_customer_id" ON "cart_order_extra_charge" (customer_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cart_order_extra_charge_deleted_at" ON "cart_order_extra_charge" (deleted_at) WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "cart_order_extra_charge" cascade;`)
  }
}
