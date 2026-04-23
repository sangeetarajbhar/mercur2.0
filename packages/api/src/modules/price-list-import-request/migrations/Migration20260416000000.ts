import { Migration } from "@mikro-orm/migrations"

export class Migration20260416000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "price_list_import_request" ("id" text not null, "type" text not null default 'price_list', "data" jsonb not null, "submitter_id" text not null, "seller_id" text not null, "file_name" text not null, "transaction_id" text null, "reviewer_id" text null, "reviewer_note" text null, "status" text check ("status" in ('draft', 'pending', 'accepted', 'rejected')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "price_list_import_request_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_price_list_import_request_deleted_at" ON "price_list_import_request" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_price_list_import_request_seller_id" ON "price_list_import_request" (seller_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_price_list_import_request_status" ON "price_list_import_request" (status) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "price_list_import_request" cascade;`)
  }
}
