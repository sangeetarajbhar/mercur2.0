import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250624045409 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "extra_charge" ("id" text not null, "name" text not null, "amount" numeric not null, "status" text check ("status" in ('active', 'inactive')) not null default 'active', "created_by" text not null, "updated_by" text not null, "raw_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "extra_charge_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_extra_charge_deleted_at" ON "extra_charge" (deleted_at) WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "extra_charge" cascade;`)
  }
}
