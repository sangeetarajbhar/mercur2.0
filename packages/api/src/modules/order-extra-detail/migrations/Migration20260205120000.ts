import { Migration } from '@mikro-orm/migrations';

export class Migration20260205120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_extra_detail" add column if not exists "invoice_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_extra_detail" drop column if exists "invoice_id";`);
  }

}
