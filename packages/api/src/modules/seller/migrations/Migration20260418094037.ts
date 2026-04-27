import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260418094037 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "member" add column if not exists "role" text check ("role" in ('owner', 'admin', 'member')) not null default 'owner', add column if not exists "name" text not null, add column if not exists "bio" text null, add column if not exists "phone" text null, add column if not exists "photo" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "member" drop column if exists "role", drop column if exists "name", drop column if exists "bio", drop column if exists "phone", drop column if exists "photo";`);
  }

}
