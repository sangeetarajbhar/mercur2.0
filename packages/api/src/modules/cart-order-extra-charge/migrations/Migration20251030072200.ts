import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251030072200 extends Migration {
  async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_cart_order_extra_charge_customer_id";`)
    this.addSql(
      `alter table if exists "cart_order_extra_charge" alter column "customer_id" type text using ("customer_id"::text);`
    )
    this.addSql(
      `alter table if exists "cart_order_extra_charge" alter column "customer_id" drop not null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table if exists "cart_order_extra_charge" alter column "customer_id" type text using ("customer_id"::text);`
    )
    this.addSql(
      `alter table if exists "cart_order_extra_charge" alter column "customer_id" set not null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cart_order_extra_charge_customer_id" ON "cart_order_extra_charge" (customer_id) WHERE deleted_at IS NULL;`
    )
  }
}
