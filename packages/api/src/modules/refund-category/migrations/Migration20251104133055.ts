import { Migration } from '@mikro-orm/migrations';

export class Migration20251104133055 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "refund_category" ("id" text not null, "name" text check ("name" in ('logistics', 'customer', 'seller')) not null, "description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "refund_category_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_refund_category_deleted_at" ON "refund_category" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "refund_category" cascade;`);
  }

}

