import { Migration } from "@mikro-orm/migrations"

export class Migration20251001103636 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "zone" ("id" text not null, "location_id" text not null, "name" text not null, "description" text null, "postcodes" jsonb not null, "is_active" boolean not null default true, "metadata" jsonb not null default '{}', "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "zone_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_zone_deleted_at" ON "zone" (deleted_at) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "zone" cascade;`)
  }
}
