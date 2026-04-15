import { Migration } from '@mikro-orm/migrations';
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses';


export class Migration20251120050403 extends Migration {
        
    override async up(): Promise<void> {    

    const enumValues = Object.values(OrderLineItemStatus);
    const enumValuesString = enumValues
      .map(value => `'${value}'`)
      .join(', ');
      
        // Add new enum values if they don't exist
        this.addSql(`
            DO $$ 
            DECLARE
              enum_value text;
              enum_type_oid oid;
            BEGIN
              -- Get the enum type OID if it exists
              SELECT oid INTO enum_type_oid 
              FROM pg_type 
              WHERE typname = 'order_line_item_status_enum';
              
              -- Only proceed if enum type exists
              IF enum_type_oid IS NOT NULL THEN
                FOREACH enum_value IN ARRAY ARRAY[${enumValues.map(v => `'${v}'`).join(', ')}]
                LOOP
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = enum_value 
                    AND enumtypid = enum_type_oid
                  ) THEN
                    EXECUTE format('ALTER TYPE order_line_item_status_enum ADD VALUE %L', enum_value);
                  END IF;
                END LOOP;
              END IF;
            END $$;
          `);
        }

    override async down(): Promise<void> {
        // Note: PostgreSQL does not support removing enum values from an existing enum type.
        // To remove enum values, you would need to:
        // 1. Create a new enum type with the desired values
        // 2. Alter the table to use the new enum type
        // 3. Drop the old enum type
        // This is a complex operation that could cause data loss and is not recommended.
        // Therefore, this migration is not reversible.
    }
}