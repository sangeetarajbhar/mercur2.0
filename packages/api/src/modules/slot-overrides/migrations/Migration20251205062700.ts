import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251205062700 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_slot_override_zone_date_time" ON "slot_override" ("zone_id", "slot_date", "start_time", "end_time") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "UQ_slot_override_zone_date_time";`)
  }
}
