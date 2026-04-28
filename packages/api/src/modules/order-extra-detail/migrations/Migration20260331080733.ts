import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260331080733 extends Migration {

  override async up(): Promise<void> {
    // this.addSql(`alter table if exists "order_extra_detail" add column if not exists "confirmed_at" timestamptz null, add column if not exists "tracking_id" text null, add column if not exists "courier_code" text null, add column if not exists "invoice_id" text null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_extra_detail_order_id" ON "order_extra_detail" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_extra_detail_stock_location_id" ON "order_extra_detail" ("stock_location_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_order_extra_detail_order_id";`);
    this.addSql(`drop index if exists "IDX_order_extra_detail_stock_location_id";`);
    // this.addSql(`alter table if exists "order_extra_detail" drop column if exists "confirmed_at", drop column if exists "tracking_id", drop column if exists "courier_code", drop column if exists "invoice_id";`);
  }

}
