import { Migration } from '@mikro-orm/migrations';

export class Migration20251001130150 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "customer_details" ("id" text not null, "dob" timestamptz not null, "gender" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_details_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_details_deleted_at" ON "customer_details" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_details" cascade;`);
  }

}
