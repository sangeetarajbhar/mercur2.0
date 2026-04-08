import { Migration } from "@mikro-orm/migrations"

export class Migration20251001105351 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "slot_definition" ("id" text not null, "zone_id" text not null, "slot_key" text not null, "start_time" text not null, "end_time" text not null, "default_capacity" integer not null, "is_active" boolean not null default true, "cut_off_time" text not null, "metadata" jsonb not null default '{}', "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "slot_definition_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_slot_definition_deleted_at" ON "slot_definition" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_slot_def_zone" ON "slot_definition" (zone_id);`)
    this.addSql(
      `ALTER TABLE "slot_definition" ADD CONSTRAINT "FK_slot_definition_zone_id" FOREIGN KEY ("zone_id") REFERENCES "zone"("id") ON DELETE CASCADE;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "slot_definition" cascade;`)
  }
}
