import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260420063848 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "location_hierarchy" ("id" text not null, "parent_location_id" text not null, "child_location_id" text not null, "promise_minutes" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "location_hierarchy_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_location_hierarchy_deleted_at" ON "location_hierarchy" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "location_hierarchy" cascade;`);
  }

}
