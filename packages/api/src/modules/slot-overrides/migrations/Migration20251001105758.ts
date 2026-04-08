import { Migration } from "@mikro-orm/migrations"

export class Migration20251001105758 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "slot_override" ("id" text not null, "zone_id" text not null, "slot_date" text not null, "start_time" text not null, "end_time" text not null, "total_capacity" integer not null, "remaining_capacity" integer not null, "is_active" boolean not null default true, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "slot_override_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_slot_override_deleted_at" ON "slot_override" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `ALTER TABLE "slot_override" ADD CONSTRAINT "FK_slot_override_zone_id" FOREIGN KEY ("zone_id") REFERENCES "zone"("id") ON DELETE CASCADE;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "slot_override" cascade;`)
  }
}
