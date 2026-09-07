import { Migration } from '@mikro-orm/migrations';

export class Migration20250716064505 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "extend_price" ("id" text not null, "percentage_discount" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "extend_price_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_extend_price_deleted_at" ON "extend_price" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "extend_price" cascade;`);
  }

}

