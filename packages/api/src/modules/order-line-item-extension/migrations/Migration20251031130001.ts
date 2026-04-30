import { Migration } from '@mikro-orm/migrations';

export class Migration20251031130001 extends Migration {

  override async up(): Promise<void> {
    // Add shipment_id column to link line items to shipments
    this.addSql(`
      ALTER TABLE IF EXISTS "order_line_item_extension" 
      ADD COLUMN IF NOT EXISTS "shipment_id" text NULL;
    `);

    // Create index for shipment_id for better query performance
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_line_item_extension_shipment_id" ON "order_line_item_extension" (shipment_id) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    // Drop the shipment_id column
    this.addSql(`
      ALTER TABLE IF EXISTS "order_line_item_extension" 
      DROP COLUMN IF EXISTS "shipment_id";
    `);
  }

}
