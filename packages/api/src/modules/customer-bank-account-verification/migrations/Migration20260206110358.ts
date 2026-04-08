import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260206110358 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table if exists "customer_bank_account_verification" add column if not exists "fav_id" text null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table if exists "customer_bank_account_verification" drop column if exists "fav_id";`
    )
  }
}
