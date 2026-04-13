import { Migration } from '@mikro-orm/migrations';

export class Migration20250615145552 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_configuration" ("id" text not null, "returnable_days" integer not null, "exchangeable_days" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_configuration_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_configuration_deleted_at" ON "product_configuration" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_configuration" cascade;`);
  }

}
