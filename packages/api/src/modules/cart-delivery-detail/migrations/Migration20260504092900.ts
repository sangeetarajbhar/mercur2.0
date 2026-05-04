import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260504092900 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cart_delivery_detail_promise_key" ON "cart_delivery_detail" ("promise_key") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_cart_delivery_detail_promise_key";`);
  }

}
