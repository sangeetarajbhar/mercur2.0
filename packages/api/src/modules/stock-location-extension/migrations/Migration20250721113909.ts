import { Migration } from "@mikro-orm/migrations"

export class Migration20250721113909 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "stock_location_extension" ("id" text not null, "location_type" text not null, "address_type" text not null, "latitude" real null, "longitude" real null, "partner_id" text not null, "return_location_id" text not null, "status" text not null, "servisibility_status" text not null, "start_time" text not null, "end_time" text not null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_location_extension_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_location_extension_deleted_at" ON "stock_location_extension" (deleted_at) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_location_extension" cascade;`)
  }
}
