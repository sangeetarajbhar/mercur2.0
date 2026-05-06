import { Migration } from '@mikro-orm/migrations';

export class Migration20251118131809 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_line_item_extension" add column if not exists "item_total" numeric null, add column if not exists "item_discount_total" numeric null, add column if not exists "raw_item_total" jsonb null, add column if not exists "raw_item_discount_total" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_line_item_extension" drop column if exists "item_total", drop column if exists "item_discount_total", drop column if exists "raw_item_total", drop column if exists "raw_item_discount_total";`);
  }

}
