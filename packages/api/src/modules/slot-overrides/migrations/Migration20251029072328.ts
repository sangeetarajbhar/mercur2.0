import { Migration } from "@mikro-orm/migrations"

export class Migration20251029072327 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "slot_override" add column if not exists "cut_off_time" text null;`)
    this.addSql(`alter table if exists "slot_override" alter column "slot_key" type text using ("slot_key"::text);`)
    this.addSql(`alter table if exists "slot_override" alter column "slot_key" drop not null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "slot_override" drop column if exists "cut_off_time";`)
    this.addSql(`alter table if exists "slot_override" alter column "slot_key" type text using ("slot_key"::text);`)
    this.addSql(`alter table if exists "slot_override" alter column "slot_key" set not null;`)
  }
}
