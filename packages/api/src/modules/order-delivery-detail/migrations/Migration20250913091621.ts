import { Migration } from '@mikro-orm/migrations';

export class Migration20250913091621 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_delivery_info" rename column "order_id" to "order_set_id";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_delivery_info" rename column "order_set_id" to "order_id";`);
  }

}
