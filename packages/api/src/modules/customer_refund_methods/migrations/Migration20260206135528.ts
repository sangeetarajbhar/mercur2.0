import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260206135528 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "customer_refund_method_customer_id_idx" ON "customer_refund_method" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "customer_refund_method_customer_default_idx" ON "customer_refund_method" ("customer_id", "is_default") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "customer_refund_method_account_hmac_idx" ON "customer_refund_method" ("account_number_hmac", "status") WHERE account_number_hmac IS NOT NULL AND deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "customer_refund_method_upi_hmac_idx" ON "customer_refund_method" ("upi_id_hmac", "status") WHERE upi_id_hmac IS NOT NULL AND deleted_at IS NULL;`
    )
  }
  async down(): Promise<void> {
    this.addSql(`drop index if exists "customer_refund_method_customer_id_idx";`)
    this.addSql(`drop index if exists "customer_refund_method_customer_default_idx";`)
    this.addSql(`drop index if exists "customer_refund_method_account_hmac_idx";`)
    this.addSql(`drop index if exists "customer_refund_method_upi_hmac_idx";`)
  }
}
