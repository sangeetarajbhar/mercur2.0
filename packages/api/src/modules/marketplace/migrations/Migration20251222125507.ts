import { Migration } from '@mikro-orm/migrations';

export class Migration20251222125507 extends Migration {

  override async up(): Promise<void> {
    // Add PAYMENT_PENDING to order_set_status_enum if it doesn't exist
    // Following the pattern from Migration20251030064543.ts
    this.addSql(`
      DO $$ 
      DECLARE
        enum_type_oid oid;
      BEGIN
        -- Get the enum type OID if it exists
        SELECT oid INTO enum_type_oid 
        FROM pg_type 
        WHERE typname = 'order_set_status_enum';
        
        -- Only proceed if enum type exists
        IF enum_type_oid IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'PAYMENT_PENDING' 
            AND enumtypid = enum_type_oid
          ) THEN
            -- Add the enum value using EXECUTE format (consistent with existing migrations)
            EXECUTE format('ALTER TYPE order_set_status_enum ADD VALUE %L', 'PAYMENT_PENDING');
          END IF;
        END IF;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    // Note: We cannot remove enum values in PostgreSQL, so PAYMENT_PENDING will remain in the enum
    // This is a limitation of PostgreSQL enums
  }

}


