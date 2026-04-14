import { Migration } from '@mikro-orm/migrations';

export class Migration20250629235420 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "promotion_extension" ("id" text not null, "cart_sub_total" integer not null default 0, "promo_code_upper_limit" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "promotion_extension_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_promotion_extension_deleted_at" ON "promotion_extension" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "promotion_extension" cascade;`);
  }

}

