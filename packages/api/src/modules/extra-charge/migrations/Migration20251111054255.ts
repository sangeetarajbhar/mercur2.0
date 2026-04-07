import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251111054255 extends Migration {
  async up(): Promise<void> {
    this.addSql(`alter table if exists "extra_charge" add column if not exists "type" text null;`)
  }

  async down(): Promise<void> {
    this.addSql(`alter table if exists "extra_charge" drop column if exists "type";`)
  }
}
