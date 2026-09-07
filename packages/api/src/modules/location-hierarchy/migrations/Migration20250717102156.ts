import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250717102156 extends Migration {
  async up(): Promise<void> {
    this.addSql(`create table if not exists "location_hierarchy" ("id" text not null, "parent_location_id" text not null, "child_location_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "location_hierarchy_pkey" primary key ("id"));`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "location_hierarchy" cascade;`)
  }
}
