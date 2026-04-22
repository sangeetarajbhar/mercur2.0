import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260420114832 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "location_hierarchy" add column if not exists "promise_minutes" integer not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "location_hierarchy" drop column if exists "promise_minutes";`);
  }

}
