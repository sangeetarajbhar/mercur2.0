import { Migration } from '@mikro-orm/migrations';

export class Migration20251030100522 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "cart_delivery_detail" add column if not exists "slot_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "cart_delivery_detail" drop column if exists "slot_id";`);
  }

}
