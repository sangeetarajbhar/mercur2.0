import { Migration } from '@mikro-orm/migrations';

export class Migration20251013095127 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "control" ("id" text not null, "scope" text check ("scope" in ('zone', 'darkstore')) not null, "scope_id" text not null, "is_instant_enabled" boolean not null default true, "is_slotted_enabled" boolean not null default true, "delay_minutes" integer not null default 0, "delay_message" text null, "message_icon" text null, "reason" jsonb null, "is_active" boolean not null default true, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "control_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_control_deleted_at" ON "control" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_control_scope_scope_id" ON "control" (scope, scope_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_control_scope_scopeid" ON "control" (scope, scope_id);`);

  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "control" cascade;`);
  }

}
