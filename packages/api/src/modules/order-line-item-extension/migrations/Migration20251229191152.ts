import { Migration } from '@mikro-orm/migrations';
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses';

export class Migration20251229191152 extends Migration {

  override async up(): Promise<void> {
    // Add RFR to enum if it doesn't exist
    // Following the pattern from Migration20251222125506.ts
    this.addSql(`
      DO $$ 
      DECLARE
        enum_type_oid oid;
      BEGIN
        -- Get the enum type OID if it exists
        SELECT oid INTO enum_type_oid 
        FROM pg_type 
        WHERE typname = 'order_line_item_status_enum';
        
        -- Only proceed if enum type exists
        IF enum_type_oid IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = '${OrderLineItemStatus.RFR}' 
            AND enumtypid = enum_type_oid
          ) THEN
            -- Add the enum value using EXECUTE format (consistent with existing migrations)
            EXECUTE format('ALTER TYPE order_line_item_status_enum ADD VALUE %L', '${OrderLineItemStatus.RFR}');
          END IF;
        END IF;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    // Note: We cannot remove enum values in PostgreSQL, so RFR will remain in the enum
    // This is a limitation of PostgreSQL enums
  }

}

