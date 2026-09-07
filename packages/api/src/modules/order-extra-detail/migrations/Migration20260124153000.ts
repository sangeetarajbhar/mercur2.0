import { Migration } from '@mikro-orm/migrations';

export class Migration20260124153000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_extra_detail" add column if not exists "tracking_id" text null;`);
    this.addSql(`alter table if exists "order_extra_detail" add column if not exists "courier_code" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_extra_detail" drop column if exists "tracking_id";`);
    this.addSql(`alter table if exists "order_extra_detail" drop column if exists "courier_code";`);
  }

}
