import { Migration } from '@mikro-orm/migrations';

export class Migration20260413161625 extends Migration {

  override async up(): Promise<void> {
    // this.addSql(`UPDATE "customer_address" SET "is_default_billing" = false WHERE "deleted_at" IS NOT NULL AND "is_default_billing" = true;`);
    // this.addSql(`UPDATE "customer_address" SET "is_default_shipping" = false WHERE "deleted_at" IS NOT NULL AND "is_default_shipping" = true;`);

    this.addSql(`drop index if exists "IDX_customer_address_unique_customer_billing";`);
    this.addSql(`drop index if exists "IDX_customer_address_unique_customer_shipping";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_address_unique_customer_billing" ON "customer_address" ("customer_id") WHERE "is_default_billing" = true AND "deleted_at" IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_address_unique_customer_shipping" ON "customer_address" ("customer_id") WHERE "is_default_shipping" = true AND "deleted_at" IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_customer_address_unique_customer_billing";`);
    this.addSql(`drop index if exists "IDX_customer_address_unique_customer_shipping";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_address_unique_customer_billing" ON "customer_address" ("customer_id") WHERE "is_default_billing" = true;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_address_unique_customer_shipping" ON "customer_address" ("customer_id") WHERE "is_default_shipping" = true;`);
  }

}
