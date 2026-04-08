import { Migration } from "@mikro-orm/migrations"

export class Migration20251010150655 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "slot_override" add column if not exists "slot_key" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "slot_override" drop column if exists "slot_key";`)
  }
}
