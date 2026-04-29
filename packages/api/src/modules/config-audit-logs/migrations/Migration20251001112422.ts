import { Migration } from '@mikro-orm/migrations';

export class Migration20251001112422 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "config_audit_log" ("id" text not null, "entity_type" text not null, "entity_id" text not null, "operation" text not null, "old_data" jsonb null, "new_data" jsonb null, "changed_by" text null, "request_id" text null, "metadata" jsonb not null default '{}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "config_audit_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_config_audit_log_deleted_at" ON "config_audit_log" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "config_audit_log" cascade;`);
  }

}
