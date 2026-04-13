import { Migration } from '@mikro-orm/migrations';

export class Migration20251209161738 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" add column if not exists "is_hidden" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" drop column if exists "is_hidden";`);
  }

}

