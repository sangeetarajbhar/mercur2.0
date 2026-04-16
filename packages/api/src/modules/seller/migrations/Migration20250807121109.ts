import { Migration } from '@mikro-orm/migrations';

export class Migration20250807121109 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop table if exists "brand_association" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table if not exists "brand_association" ("id" text not null, "brand_id" text not null, "brand_name" text not null, "seller_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_association_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_association_seller_id" ON "brand_association" (seller_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_association_deleted_at" ON "brand_association" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "brand_association" add constraint "brand_association_seller_id_foreign" foreign key ("seller_id") references "seller" ("id") on update cascade;`);
  }

}
