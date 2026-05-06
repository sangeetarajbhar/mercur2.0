import { Migration } from '@mikro-orm/migrations';

export class Migration20251031090305 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_extra_detail" add column if not exists "packed_by" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_extra_detail" drop column if exists "packed_by";`);
  }

}
