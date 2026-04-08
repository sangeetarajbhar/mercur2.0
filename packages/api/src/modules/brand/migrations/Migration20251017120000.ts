import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251017120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table if exists "brand" add column if not exists "is_active" boolean not null default true;'
    )
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table if exists "brand" drop column if exists "is_active";'
    )
  }
}
