import { Migration } from '@mikro-orm/migrations';

export class Migration20251017070803 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "cart_delivery_detail" drop column if exists "delivery_time", drop column if exists "delivery_slot_type";`);

    this.addSql(`alter table if exists "cart_delivery_detail" add column if not exists "start_time" text not null, add column if not exists "end_time" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "cart_delivery_detail" drop column if exists "start_time", drop column if exists "end_time";`);

    this.addSql(`alter table if exists "cart_delivery_detail" add column if not exists "delivery_time" text not null, add column if not exists "delivery_slot_type" text not null;`);
  }

}
