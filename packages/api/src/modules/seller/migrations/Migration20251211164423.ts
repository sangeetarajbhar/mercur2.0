import { Migration } from '@mikro-orm/migrations';

export class Migration20251211164423 extends Migration {

  override async up(): Promise<void> {
    // Remove contact_person column from company_spoc table
    // This column is no longer needed as we use first_name and last_name instead
    this.addSql(`ALTER TABLE IF EXISTS "company_spoc" DROP COLUMN IF EXISTS "contact_person";`);
  }

  override async down(): Promise<void> {
    // Revert: Add back the contact_person column
    // Note: This will be nullable to avoid issues with existing data
    this.addSql(`ALTER TABLE IF EXISTS "company_spoc" ADD COLUMN IF NOT EXISTS "contact_person" text null;`);
  }

}

