import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260422072248 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "rating_config" ("id" text not null, "status" text check ("status" in ('active', 'inactive', 'draft')) not null default 'active', "option_text" text null, "sort_order" integer not null default 0, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rating_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rating_config_deleted_at" ON "rating_config" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "rating_feedback" ("id" text not null, "session_id" text not null, "status" text check ("status" in ('active', 'archived')) not null default 'active', "customer_id" text null, "order_id" text null, "rating" integer not null, "option_id" text null, "custom_text" text null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rating_feedback_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rating_feedback_deleted_at" ON "rating_feedback" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "rating_config" cascade;`);

    this.addSql(`drop table if exists "rating_feedback" cascade;`);
  }

}
