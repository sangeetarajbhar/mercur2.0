import { Migration } from '@mikro-orm/migrations';

export class Migration20250711000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" add column if not exists "first_customer" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" drop column if exists "first_customer";`);
  }

}

