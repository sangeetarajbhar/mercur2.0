import { Migration } from '@mikro-orm/migrations';

export class Migration20250618101938 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" drop column if exists "exchangeable_days";`);

    this.addSql(`alter table if exists "product_configuration" alter column "returnable_days" type integer using ("returnable_days"::integer);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" add column if not exists "exchangeable_days" text not null;`);
    this.addSql(`alter table if exists "product_configuration" alter column "returnable_days" type text using ("returnable_days"::text);`);
  }

}
