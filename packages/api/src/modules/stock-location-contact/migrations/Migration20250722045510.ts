import { Migration } from '@mikro-orm/migrations';

export class Migration20250722045510 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "stock_location_contact" ("id" text not null, "stock_location_section_id" text not null, "first_name" text not null, "last_name" text not null, "email" text not null, "phone_number" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_location_contact_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_location_contact_deleted_at" ON "stock_location_contact" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_location_contact" cascade;`);
  }

}
