import { Migration } from "@mikro-orm/migrations"

export class Migration20250821094342 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "stock_location_extension" DROP COLUMN "is_rain";`)
    this.addSql(
      `alter table if exists "stock_location_extension" add column if not exists "is_delay" boolean not null default false, add column if not exists "delay_value" text null, add column if not exists "delay_message" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "stock_location_extension" drop column if exists "is_delay", drop column if exists "delay_value", drop column if exists "delay_message";`
    )
  }
}
