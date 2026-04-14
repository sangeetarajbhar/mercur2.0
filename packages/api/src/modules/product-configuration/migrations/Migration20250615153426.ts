import { Migration } from '@mikro-orm/migrations';

export class Migration20250615153426 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" alter column "returnable_days" type text using ("returnable_days"::text);`);
    this.addSql(`alter table if exists "product_configuration" alter column "exchangeable_days" type text using ("exchangeable_days"::text);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" alter column "returnable_days" type integer using ("returnable_days"::integer);`);
    this.addSql(`alter table if exists "product_configuration" alter column "exchangeable_days" type integer using ("exchangeable_days"::integer);`);
  }

}
