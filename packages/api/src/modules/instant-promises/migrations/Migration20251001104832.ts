import { Migration } from "@mikro-orm/migrations"

export class Migration20251001104832 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "instant_promise" ("id" text not null, "zone_id" text not null, "promise_text" text not null, "promise_minutes" integer not null, "pickup_lead_minutes" integer not null default 0, "return_lead_minutes" integer not null default 0, "is_active" boolean not null default true, "metadata" jsonb not null default '{}', "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "instant_promise_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_instant_promise_deleted_at" ON "instant_promise" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `ALTER TABLE "instant_promise" ADD CONSTRAINT "FK_instant_promise_zone_id" FOREIGN KEY ("zone_id") REFERENCES "zone"("id") ON DELETE CASCADE;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "instant_promise" cascade;`)
  }
}
