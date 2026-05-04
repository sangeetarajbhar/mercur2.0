import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260504090900 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "cart_delivery_detail" add column if not exists "promise_key" integer not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "cart_delivery_detail" drop column if exists "promise_key";`);
  }

}
