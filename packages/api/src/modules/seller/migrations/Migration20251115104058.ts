import { Migration } from '@mikro-orm/migrations';

export class Migration20251115104058 extends Migration {

  override async up(): Promise<void> {
    // Drop the old barcode_auto_generate column if it exists
    this.addSql(`alter table if exists "seller" drop column if exists "barcode_auto_generate";`);
    
    // Add unique constraint to barcode column (if not already exists)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_barcode_unique" ON "seller" (barcode) WHERE deleted_at IS NULL AND barcode IS NOT NULL;`);
  }

  override async down(): Promise<void> {
    // Drop the unique constraint on barcode
    this.addSql(`DROP INDEX IF EXISTS "IDX_seller_barcode_unique";`);
    
    // Re-add the barcode_auto_generate column
    this.addSql(`alter table if exists "seller" add column if not exists "barcode_auto_generate" text null;`);
  }

}
