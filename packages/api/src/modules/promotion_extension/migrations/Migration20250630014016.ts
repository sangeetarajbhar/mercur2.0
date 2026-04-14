import { Migration } from '@mikro-orm/migrations';

export class Migration20250630014016 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" add column if not exists "seller_ids" text[] not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" drop column if exists "seller_ids";`);
  }

}

