import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260206051918 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table if exists "customer_refund_method" add column if not exists "is_account_verified" boolean not null default false, add column if not exists "status" boolean not null default false;`
    )
  }
  async down(): Promise<void> {
    this.addSql(
      `alter table if exists "customer_refund_method" drop column if exists "is_account_verified", drop column if exists "status";`
    )
  }
}
