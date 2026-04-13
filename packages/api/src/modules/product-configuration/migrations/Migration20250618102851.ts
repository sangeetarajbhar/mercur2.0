import { Migration } from '@mikro-orm/migrations';

export class Migration20250618102851 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" alter column "returnable_days" type text using ("returnable_days"::text);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" alter column "returnable_days" type integer using ("returnable_days"::integer);`);
  }

}
