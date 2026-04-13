import { Migration } from '@mikro-orm/migrations';

export class Migration20250819053058 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" add column if not exists "is_returnable" boolean not null default false, add column if not exists "is_exchangeable" boolean not null default false, add column if not exists "is_try_and_buy" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_configuration" drop column if exists "is_returnable", drop column if exists "is_exchangeable", drop column if exists "is_try_and_buy";`);
  }

}
