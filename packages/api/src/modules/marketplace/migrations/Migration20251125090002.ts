import { Migration } from '@mikro-orm/migrations'

export class Migration20251125090002 extends Migration {
  override async up(): Promise<void> {
    // Add ui_order_set_id column as BIGINT to order_set table
    this.addSql(`
      ALTER TABLE "order_set" 
      ADD COLUMN IF NOT EXISTS "ui_order_set_id" BIGINT NULL;
    `)
  }

  override async down(): Promise<void> {
    // Remove ui_order_set_id column from order_set table
    this.addSql(`
      ALTER TABLE "order_set" 
      DROP COLUMN IF EXISTS "ui_order_set_id";
    `)
  }
}

