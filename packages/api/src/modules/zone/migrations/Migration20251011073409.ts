import { Migration } from "@mikro-orm/migrations"

export class Migration20251011073409 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "zone" add column if not exists "start_time" text null, add column if not exists "end_time" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "zone" drop column if exists "start_time", drop column if exists "end_time";`
    )
  }
}
