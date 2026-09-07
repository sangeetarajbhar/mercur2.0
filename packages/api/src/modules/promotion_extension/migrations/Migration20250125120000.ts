import { Migration } from '@mikro-orm/migrations';

export class Migration20250125120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" add column if not exists "override_existing" boolean not null default true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" drop column if exists "override_existing";`);
  }

}

