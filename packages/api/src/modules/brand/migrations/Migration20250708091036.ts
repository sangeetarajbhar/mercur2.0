import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250708091036 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table if exists "brand" add column if not exists "handle" text not null;'
    )
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table if exists "brand" drop column if exists "handle";'
    )
  }
}
