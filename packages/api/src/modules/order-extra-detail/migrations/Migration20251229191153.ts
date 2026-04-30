import { Migration } from '@mikro-orm/migrations';

const ORDER_STATUS_ENUM = 'order_status_enum'
const RFR_STATUS = 'RFR'

export class Migration20251229191153 extends Migration {

  override async up(): Promise<void> {
    // Add RFR to order_status_enum if it doesn't exist
    // Following the pattern from Migration20251222125506.ts
    this.addSql(`
      DO $$ 
      DECLARE
        enum_type_oid oid;
      BEGIN
        -- Get the enum type OID if it exists
        SELECT oid INTO enum_type_oid 
        FROM pg_type 
        WHERE typname = '${ORDER_STATUS_ENUM}';
        
        -- Only proceed if enum type exists
        IF enum_type_oid IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = '${RFR_STATUS}' 
            AND enumtypid = enum_type_oid
          ) THEN
            -- Add the enum value using EXECUTE format (consistent with existing migrations)
            EXECUTE format('ALTER TYPE ${ORDER_STATUS_ENUM} ADD VALUE %L', '${RFR_STATUS}');
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

