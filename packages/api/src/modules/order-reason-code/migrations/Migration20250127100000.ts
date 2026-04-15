import { Migration } from "@mikro-orm/migrations"

export class Migration20250127100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "order_reject_cancel_reason_code" ("id" text not null, "reason_code" text not null, "reason" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_reject_cancel_reason_code_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_reject_cancel_reason_code_deleted_at" ON "order_reject_cancel_reason_code" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_reject_cancel_reason_code_reason_code" ON "order_reject_cancel_reason_code" (reason_code) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_reject_cancel_reason_code" cascade;`)
  }
}
