import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250717064030 extends Migration {
  async up(): Promise<void> {
    this.addSql(`create table if not exists "config_image_resize_config" ("id" text not null, "name" text not null, "unique_name" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "config_image_resize_config_pkey" primary key ("id"));`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_config_image_resize_config_unique_name_unique" ON "config_image_resize_config" (unique_name) WHERE deleted_at IS NULL;`)
    this.addSql(`create table if not exists "config_image_size" ("id" text not null, "name" text not null, "width" integer not null, "height" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "config_image_size_pkey" primary key ("id"));`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_config_image_size_name_unique" ON "config_image_size" (name) WHERE deleted_at IS NULL;`)
    this.addSql(`create table if not exists "config_image_resize_config_image_size" ("id" text not null, "resize_config_id" text not null, "image_size_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "config_image_resize_config_image_size_pkey" primary key ("id"));`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "config_image_resize_config" cascade;`)
    this.addSql(`drop table if exists "config_image_size" cascade;`)
    this.addSql(`drop table if exists "config_image_resize_config_image_size" cascade;`)
  }
}
