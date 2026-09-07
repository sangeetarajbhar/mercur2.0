import { Migration } from '@mikro-orm/migrations';
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses';

export class Migration20251030064543 extends Migration {

  override async up(): Promise<void> {
    // Create PostgreSQL ENUM type for order line item status using TypeScript enum
    const enumValues = Object.values(OrderLineItemStatus);
    const enumValuesString = enumValues
      .map(value => `'${value}'`)
      .join(', ');

      // console.log(enumValues);

    // Create enum type if it doesn't exist
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE order_line_item_status_enum AS ENUM (${enumValuesString});
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

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

    // Add status and timestamp columns with proper enum type
    this.addSql(`alter table if exists "order_line_item_extension" add column if not exists "status" order_line_item_status_enum not null default '${OrderLineItemStatus.NEW}', add column if not exists "accepted_at" timestamptz null, add column if not exists "rejected_at" timestamptz null, add column if not exists "cancelled_at" timestamptz null, add column if not exists "packed_at" timestamptz null, add column if not exists "shipped_at" timestamptz null, add column if not exists "delivered_at" timestamptz null, add column if not exists "reason" text null, add column if not exists "reason_code" text null;`);
    
    // Create index on status for better query performance
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_line_item_extension_status" ON "order_line_item_extension" (status) WHERE deleted_at IS NULL;`);

    // Create trigger function to automatically set timestamps based on status changes
    this.addSql(`
      CREATE OR REPLACE FUNCTION update_order_line_item_extension_timestamps()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Set timestamp based on status using TypeScript enum values
        IF NEW.status = '${OrderLineItemStatus.ACCEPTED}' AND (OLD IS NULL OR OLD.status != '${OrderLineItemStatus.ACCEPTED}') AND NEW.accepted_at IS NULL THEN
          NEW.accepted_at = now();
        END IF;
        
        IF NEW.status = '${OrderLineItemStatus.REJECTED}' AND (OLD IS NULL OR OLD.status != '${OrderLineItemStatus.REJECTED}') AND NEW.rejected_at IS NULL THEN
          NEW.rejected_at = now();
        END IF;
        
        IF NEW.status = '${OrderLineItemStatus.CANCELLED}' AND (OLD IS NULL OR OLD.status != '${OrderLineItemStatus.CANCELLED}') AND NEW.cancelled_at IS NULL THEN
          NEW.cancelled_at = now();
        END IF;
        
        IF NEW.status = '${OrderLineItemStatus.PACKED}' AND (OLD IS NULL OR OLD.status != '${OrderLineItemStatus.PACKED}') AND NEW.packed_at IS NULL THEN
          NEW.packed_at = now();
        END IF;
        
        IF NEW.status = '${OrderLineItemStatus.SHIPPED}' AND (OLD IS NULL OR OLD.status != '${OrderLineItemStatus.SHIPPED}') AND NEW.shipped_at IS NULL THEN
          NEW.shipped_at = now();
        END IF;
        
        IF NEW.status = '${OrderLineItemStatus.DELIVERED}' AND (OLD IS NULL OR OLD.status != '${OrderLineItemStatus.DELIVERED}') AND NEW.delivered_at IS NULL THEN
          NEW.delivered_at = now();
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger to call the function
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger 
          WHERE tgname = 'trigger_update_order_line_item_extension_timestamps'
          AND tgrelid = 'order_line_item_extension'::regclass
        ) THEN
          CREATE TRIGGER trigger_update_order_line_item_extension_timestamps
            BEFORE INSERT OR UPDATE ON "order_line_item_extension"
            FOR EACH ROW
            EXECUTE FUNCTION update_order_line_item_extension_timestamps();
        END IF;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    // Drop trigger and function
    this.addSql(`DROP TRIGGER IF EXISTS trigger_update_order_line_item_extension_timestamps ON "order_line_item_extension";`);
    this.addSql(`DROP FUNCTION IF EXISTS update_order_line_item_extension_timestamps();`);

    // Drop columns (generated by MikroORM)
    this.addSql(`alter table if exists "order_line_item_extension" drop column if exists "status", drop column if exists "accepted_at", drop column if exists "rejected_at", drop column if exists "cancelled_at", drop column if exists "packed_at", drop column if exists "shipped_at", drop column if exists "delivered_at", drop column if exists "reason", drop column if exists "reason_code";`);

    // Drop PostgreSQL ENUM type
    this.addSql(`DROP TYPE IF EXISTS order_line_item_status_enum;`);
  }

}
