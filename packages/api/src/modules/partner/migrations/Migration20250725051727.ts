import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250725051727 extends Migration {
  async up(): Promise<void> {
    this.addSql(`create table if not exists "partner" ("id" text not null, "name" text not null, "status" text not null, "metadata" text null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "partner_pkey" primary key ("id"));`)
  }
  async down(): Promise<void> {
    this.addSql(`drop table if exists "partner" cascade;`)
  }
}
