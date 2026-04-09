import { Migration } from "@mikro-orm/migrations"

export class Migration20251122133426 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`drop table if exists "payment_provider_config" cascade;`)
  }

  override async down(): Promise<void> {
    this.addSql(
      `create table if not exists "payment_provider_config" ("id" text not null, "payment_provider_id" text not null, "key" text not null, "value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_provider_config_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_provider_config_deleted_at" ON "payment_provider_config" (deleted_at) WHERE deleted_at IS NULL;`
    )
  }
}

