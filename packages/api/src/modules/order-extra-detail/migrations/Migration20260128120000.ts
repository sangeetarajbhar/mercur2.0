import { Migration } from '@mikro-orm/migrations';

export class Migration20260128120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_extra_detail" add column if not exists "confirmed_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_extra_detail" drop column if exists "confirmed_at";`);
  }

}

