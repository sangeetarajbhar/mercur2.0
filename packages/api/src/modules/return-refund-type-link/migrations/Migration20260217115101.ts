import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260217115101 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "return_refund_type_link" ("id" text not null, "return_id" text not null, "type" text not null, "type_id" text not null, "customer_id" text not null, "status" text not null default 'inactive', "metadata" jsonb null, "created_by" text not null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "return_refund_type_link_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_return_refund_type_link_deleted_at" ON "return_refund_type_link" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_return_refund_type_link_return_id_status" ON "return_refund_type_link" ("return_id", "status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_return_refund_type_link_type_id" ON "return_refund_type_link" ("type_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_return_refund_type_link_customer_id" ON "return_refund_type_link" ("customer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "return_refund_type_link" cascade;`)
  }
}

