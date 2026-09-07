import { Migration } from '@mikro-orm/migrations';

export class Migration20251222152905 extends Migration {

  override async up(): Promise<void> {
    // Set default value from 'NEW' to 'PAYMENT_PENDING'
    // Production-safe: Catches exception if enum not committed yet (same transaction)
    // Model already has default set, so this is just for database-level default
    this.addSql(`
      DO $$ 
      DECLARE
        enum_exists boolean;
        current_default text;
      BEGIN
        -- Check if PAYMENT_PENDING enum value exists
        SELECT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'order_set_status_enum'
          AND e.enumlabel = 'PAYMENT_PENDING'
        ) INTO enum_exists;
        
        -- Only proceed if enum value exists
        IF enum_exists THEN
          -- Get current default value (may be 'NEW' or 'NEW'::order_set_status_enum format)
          SELECT pg_get_expr(ad.adbin, ad.adrelid) INTO current_default
          FROM pg_attrdef ad
          JOIN pg_attribute a ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
          JOIN pg_class c ON a.attrelid = c.oid
          WHERE c.relname = 'order_set'
          AND a.attname = 'status';
          
          -- Change default from 'NEW' (or any other value) to 'PAYMENT_PENDING'
          -- Check if default is NULL, 'NEW', or anything other than 'PAYMENT_PENDING'
          IF current_default IS NULL 
             OR current_default LIKE '''NEW''%' 
             OR current_default NOT LIKE '''PAYMENT_PENDING''%' THEN
            BEGIN
              ALTER TABLE "order_set" 
              ALTER COLUMN "status" SET DEFAULT 'PAYMENT_PENDING';
            EXCEPTION
              WHEN OTHERS THEN
                -- If enum not committed yet (same transaction), just skip
                -- Model default will handle it, or can be set in next migration run
                IF SQLSTATE = '55P04' THEN
                  RAISE NOTICE 'Skipping default setting: enum value not committed yet. Model default will be used.';
                ELSE
                  RAISE;
                END IF;
            END;
          END IF;
        END IF;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    // Revert default value back to 'NEW'
    this.addSql(`
      ALTER TABLE "order_set" 
      ALTER COLUMN "status" SET DEFAULT 'NEW';
    `);
  }

}


