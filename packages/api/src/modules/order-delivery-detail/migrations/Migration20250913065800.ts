import { Migration } from '@mikro-orm/migrations';

export class Migration20250913065800 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "order_delivery_info" ("id" text not null, "order_id" text not null, "delivery_type" text not null, "delivery_date" timestamptz not null, "delivery_time" text not null, "delivery_slot_type" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_delivery_info_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_delivery_info_deleted_at" ON "order_delivery_info" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_delivery_info" cascade;`);
  }

}
