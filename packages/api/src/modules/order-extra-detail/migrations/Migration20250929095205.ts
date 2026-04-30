import { Migration } from '@mikro-orm/migrations';

export class Migration20250929095205 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_extra_detail" drop constraint if exists "order_extra_detail_marketplace_order_id_unique";`);
    this.addSql(`create table if not exists "order_extra_detail" ("id" text not null, "order_id" text not null, "stock_location_id" text not null, "marketplace_order_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_extra_detail_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_extra_detail_marketplace_order_id_unique" ON "order_extra_detail" (marketplace_order_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_extra_detail_deleted_at" ON "order_extra_detail" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_extra_detail" cascade;`);
  }

}
