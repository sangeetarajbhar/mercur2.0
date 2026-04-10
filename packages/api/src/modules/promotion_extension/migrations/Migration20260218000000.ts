import { Migration } from '@mikro-orm/migrations';

export class Migration20260218000000 extends Migration {

  override async up(): Promise<void> {
    // Create the enum type
    this.addSql(`DO $$ BEGIN
      CREATE TYPE "promotion_applicable_on" AS ENUM ('all', 'app', 'web');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`);

    // Add the column with the enum type, defaulting to 'all' (available everywhere)
    this.addSql(`alter table if exists "promotion_extension" add column if not exists "applicable_on" "promotion_applicable_on" not null default 'all';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "promotion_extension" drop column if exists "applicable_on";`);
    this.addSql(`DROP TYPE IF EXISTS "promotion_applicable_on";`);
  }

}

