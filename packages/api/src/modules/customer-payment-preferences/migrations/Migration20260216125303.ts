import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260216125303 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "customer_payment_preferences" ("id" text not null, "customer_id" text not null, "type" text not null, "type_id" text not null, "status" text not null, "metadata" jsonb null, "created_by" text null, "updated_by" text null, "deleted_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_payment_preferences_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_payment_preferences_deleted_at" ON "customer_payment_preferences" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_payment_preferences_customer_id" ON "customer_payment_preferences" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_payment_preferences_status" ON "customer_payment_preferences" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_payment_preferences_type_id" ON "customer_payment_preferences" ("type_id") WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_payment_preferences" cascade;`)
  }
}
