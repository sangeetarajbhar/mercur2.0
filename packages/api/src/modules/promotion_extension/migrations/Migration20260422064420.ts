import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260422064420 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" add column if not exists "is_hidden" boolean not null default false, add column if not exists "override_existing" boolean not null default true, add column if not exists "applicable_on" text check ("applicable_on" in ('all', 'app', 'web')) not null default 'all';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" drop column if exists "is_hidden", drop column if exists "override_existing", drop column if exists "applicable_on";`);
  }

}
