import { Migration } from '@mikro-orm/migrations';

export class Migration20250813101811 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "moengage_alert" drop constraint if exists "moengage_alert_alert_name_unique";`);
    this.addSql(`alter table if exists "moengage_alert" drop constraint if exists "moengage_alert_alert_id_unique";`);
    this.addSql(`create table if not exists "moengage_alert" ("id" text not null, "alert_id" text not null, "alert_name" text not null, "is_sms" boolean not null default false, "sms_attributes" text null, "is_whatsapp" boolean not null default false, "whatsapp_attributes" text null, "is_email" boolean not null default false, "email_attributes" text null, "is_push" boolean not null default false, "push_attributes" text null, "status" text not null default '1', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "moengage_alert_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_moengage_alert_alert_id_unique" ON "moengage_alert" (alert_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_moengage_alert_alert_name_unique" ON "moengage_alert" (alert_name) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_moengage_alert_deleted_at" ON "moengage_alert" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "moengage_alert" cascade;`);
  }

}
