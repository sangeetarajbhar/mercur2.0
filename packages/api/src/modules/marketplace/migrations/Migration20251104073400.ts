import { Migration } from '@mikro-orm/migrations';

export class Migration20251104073400 extends Migration {

  override async up(): Promise<void> {
    // Create order_set table
    this.addSql(`
      create table if not exists "order_set" (
        "id" text not null,
        "display_id" int4 null,
        "sales_channel_id" text not null,
        "cart_id" text not null,
        "customer_id" text null,
        "payment_collection_id" text not null,
        "created_at" timestamptz(6) not null default now(),
        "updated_at" timestamptz(6) not null default now(),
        "deleted_at" timestamptz(6) null,
        constraint "order_set_pkey" primary key ("id")
      );
    `);
    
    // Create indexes
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_set_deleted_at" ON "order_set" ("deleted_at") WHERE ("deleted_at" IS NULL);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_set_sales_channel_id" ON "order_set" ("sales_channel_id") WHERE ("deleted_at" IS NULL);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_set_customer_id" ON "order_set" ("customer_id") WHERE ("deleted_at" IS NULL AND "customer_id" IS NOT NULL);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_set_cart_id" ON "order_set" ("cart_id") WHERE ("deleted_at" IS NULL);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_set" cascade;`);
  }

}

