import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250706094800 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "extra_charge_rule" ("id" text not null, "extra_charge_id" text not null, "name" text not null, "description" text null, "attribute" text not null, "operator" text check ("operator" in ('eq', 'in', 'gt', 'lt', 'gte', 'lte')) not null, "values" jsonb not null, "min_cart_total" numeric null, "max_cart_total" numeric null, "min_quantity" integer null, "max_quantity" integer null, "priority" integer not null default 0, "status" text check ("status" in ('active', 'inactive')) not null default 'active', "starts_at" timestamptz null, "ends_at" timestamptz null, "metadata" jsonb null, "created_by" text not null, "updated_by" text not null, "raw_min_cart_total" jsonb null, "raw_max_cart_total" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "extra_charge_rule_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_extra_charge_rule_deleted_at" ON "extra_charge_rule" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_extra_charge_rule_extra_charge_id" ON "extra_charge_rule" (extra_charge_id);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_extra_charge_rule_status" ON "extra_charge_rule" (status);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_extra_charge_rule_attribute" ON "extra_charge_rule" (attribute);`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "extra_charge_rule" cascade;`)
  }
}
