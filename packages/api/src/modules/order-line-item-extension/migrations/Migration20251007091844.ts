import { Migration } from '@mikro-orm/migrations';

export class Migration20251007091844 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "order_line_item_extension" ("id" text not null, "order_line_item_id" text not null, "returnable_flag" boolean not null default false, "return_no_of_days" integer not null default 0, "return_end_date" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_line_item_extension_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_line_item_extension_deleted_at" ON "order_line_item_extension" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_line_item_extension" cascade;`);
  }

}
