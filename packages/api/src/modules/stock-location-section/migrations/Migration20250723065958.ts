import { Migration } from '@mikro-orm/migrations';

export class Migration20250723065958 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "stock_location_section" ("id" text not null, "stock_location_id" text not null, "address_type" text not null, "partner_wh_code" text not null, "lead_time" text not null, "managed_by" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_location_section_pkey" primary key ("id"), constraint stock_location_section_check check (((address_type != '3') OR (partner_wh_code IS NOT NULL AND lead_time IS NOT NULL AND managed_by IS NOT NULL))));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_location_section_deleted_at" ON "stock_location_section" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_location_section" cascade;`);
  }

}
