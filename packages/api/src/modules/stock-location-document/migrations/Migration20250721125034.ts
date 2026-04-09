import { Migration } from '@mikro-orm/migrations';

export class Migration20250721125034 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "stock_location_document" ("id" text not null, "stock_location_section_id" text not null, "document_type" text not null, "document_number" text not null, "pdf_url" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_location_document_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_location_document_deleted_at" ON "stock_location_document" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_location_document" cascade;`);
  }

}
