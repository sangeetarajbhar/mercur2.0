import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251218092632 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_slot_definition_zone_time" ON "slot_definition" ("zone_id", "start_time", "end_time") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "UQ_slot_definition_zone_time";`)
  }
}
