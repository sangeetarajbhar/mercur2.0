import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260218131744 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "payout_transactions" add column if not exists "type" text null, add column if not exists "type_id" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "payout_transactions" drop column if exists "type", drop column if exists "type_id";`)
  }
}
