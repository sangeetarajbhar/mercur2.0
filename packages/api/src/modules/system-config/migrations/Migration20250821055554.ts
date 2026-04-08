import { Migration } from "@mikro-orm/migrations"

export class Migration20250821055554 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "system_config" ("id" text not null, "key" text not null, "value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "system_config_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_system_config_deleted_at" ON "system_config" (deleted_at) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "system_config" cascade;`)
  }
}

