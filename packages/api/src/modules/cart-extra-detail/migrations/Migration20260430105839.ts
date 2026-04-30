import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260430105839 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "cart_extra_detail" ("id" text not null, "shipping_type" text check ("shipping_type" in ('single', 'multi')) not null default 'single', "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cart_extra_detail_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cart_extra_detail_deleted_at" ON "cart_extra_detail" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cart_extra_detail" cascade;`);
  }

}
