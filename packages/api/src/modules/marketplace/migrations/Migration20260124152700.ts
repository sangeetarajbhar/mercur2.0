import { Migration } from '@mikro-orm/migrations';

export class Migration20260124152700 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_set" rename column "courier_name" to "courier_code";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_set" rename column "courier_code" to "courier_name";`);
  }

}
