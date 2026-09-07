import { Migration } from '@mikro-orm/migrations';

export class Migration20250915055203 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "cart_delivery_detail" ("id" text not null, "cart_id" text not null, "delivery_type" text not null, "delivery_date" timestamptz not null, "delivery_time" text not null, "delivery_slot_type" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cart_delivery_detail_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cart_delivery_detail_deleted_at" ON "cart_delivery_detail" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cart_delivery_detail" cascade;`);
  }

}
