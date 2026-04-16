import { Migration } from '@mikro-orm/migrations';

export class Migration20251210170630 extends Migration {

  override async up(): Promise<void> {
    // Update kyc_document table to add missing enum values to kyc_type
    // Adding 'GST_CERTIFICATE' and 'MSME_CERTIFICATE' to the kyc_type enum constraint
    
    // Find and drop the existing check constraint on kyc_type column
    // PostgreSQL auto-generates constraint names, so we need to find it dynamically
    this.addSql(`
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        -- Find the constraint name for kyc_type check constraint
        SELECT conname INTO constraint_name
        FROM pg_constraint
        WHERE conrelid = 'kyc_document'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%kyc_type%';
        
        -- Drop the constraint if found
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE kyc_document DROP CONSTRAINT IF EXISTS %I', constraint_name);
        END IF;
      END $$;
    `);
    
    // Add the updated check constraint with all enum values including the new ones
    this.addSql(`ALTER TABLE IF EXISTS "kyc_document" ADD CONSTRAINT "kyc_document_kyc_type_check" 
      CHECK ("kyc_type" IN ('PAN', 'TAN', 'NOODLE_LETTER', 'SIGNATURE', 'COI', 'INVOICE_GUIDELINE', 
      'CANCELLED_CHEQUE', 'AGREEMENT', 'TRADEMARK', 'SIN_NUMBER', 'GST_CERTIFICATE', 'MSME_CERTIFICATE', 'OTHERS'));`);
    
    // Also update value and file_url columns to be nullable if they are currently NOT NULL
    // This matches the model definition where they are model.text() without .notNull()
    this.addSql(`ALTER TABLE IF EXISTS "kyc_document" ALTER COLUMN "value" DROP NOT NULL;`);
    this.addSql(`ALTER TABLE IF EXISTS "kyc_document" ALTER COLUMN "file_url" DROP NOT NULL;`);
  }

  override async down(): Promise<void> {
    // Revert the changes: remove the new enum values and restore NOT NULL constraints
    
    // Find and drop the constraint (handles both named and auto-generated constraints)
    this.addSql(`
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        -- Find the constraint name for kyc_type check constraint
        SELECT conname INTO constraint_name
        FROM pg_constraint
        WHERE conrelid = 'kyc_document'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%kyc_type%';
        
        -- Drop the constraint if found
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE kyc_document DROP CONSTRAINT IF EXISTS %I', constraint_name);
        END IF;
      END $$;
    `);
    
    // Restore the original check constraint without GST_CERTIFICATE and MSME_CERTIFICATE
    this.addSql(`ALTER TABLE IF EXISTS "kyc_document" ADD CONSTRAINT "kyc_document_kyc_type_check" 
      CHECK ("kyc_type" IN ('PAN', 'TAN', 'NOODLE_LETTER', 'SIGNATURE', 'COI', 'INVOICE_GUIDELINE', 
      'CANCELLED_CHEQUE', 'AGREEMENT', 'TRADEMARK', 'SIN_NUMBER', 'OTHERS'));`);
    
    // Restore NOT NULL constraints (note: this might fail if there are NULL values)
    this.addSql(`ALTER TABLE IF EXISTS "kyc_document" ALTER COLUMN "value" SET NOT NULL;`);
    this.addSql(`ALTER TABLE IF EXISTS "kyc_document" ALTER COLUMN "file_url" SET NOT NULL;`);
  }

}
