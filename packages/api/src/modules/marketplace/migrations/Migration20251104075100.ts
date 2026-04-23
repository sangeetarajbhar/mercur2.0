import { Migration } from '@mikro-orm/migrations';

export class Migration20251104075100 extends Migration {

  override async up(): Promise<void> {
    // Create enum type for order_set status (only if it doesn't exist)
    this.addSql(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_set_status_enum') THEN
          CREATE TYPE "order_set_status_enum" AS ENUM (
            'NEW',
            'ACCEPTED', 
            'REJECTED',
            'CANCELLED',
            'PACKED',
            'SHIPPED',
            'DELIVERED'
          );
        END IF;
      END $$;
    `);

    // Add status column with enum type and default (only if it doesn't exist)
    this.addSql(`
      ALTER TABLE "order_set" 
      ADD COLUMN IF NOT EXISTS "status" "order_set_status_enum" NOT NULL DEFAULT 'NEW';
    `);

    // Add timestamp columns for status tracking (only if they don't exist)
    this.addSql(`
      ALTER TABLE "order_set"
      ADD COLUMN IF NOT EXISTS "accepted_at" timestamptz(6) NULL,
      ADD COLUMN IF NOT EXISTS "rejected_at" timestamptz(6) NULL,
      ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz(6) NULL,
      ADD COLUMN IF NOT EXISTS "packed_at" timestamptz(6) NULL,
      ADD COLUMN IF NOT EXISTS "shipped_at" timestamptz(6) NULL,
      ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz(6) NULL;
    `);

    // Create index on status column for faster queries (only if it doesn't exist)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_order_set_status" 
      ON "order_set" ("status") 
      WHERE ("deleted_at" IS NULL);
    `);
  }

  override async down(): Promise<void> {
    // Drop the index
    this.addSql(`DROP INDEX IF EXISTS "IDX_order_set_status";`);

    // Drop the timestamp columns
    this.addSql(`
      ALTER TABLE "order_set"
      DROP COLUMN IF EXISTS "accepted_at",
      DROP COLUMN IF EXISTS "rejected_at",
      DROP COLUMN IF EXISTS "cancelled_at",
      DROP COLUMN IF EXISTS "packed_at",
      DROP COLUMN IF EXISTS "shipped_at",
      DROP COLUMN IF EXISTS "delivered_at";
    `);

    // Drop the status column
    this.addSql(`ALTER TABLE "order_set" DROP COLUMN IF EXISTS "status";`);

    // Drop the enum type
    this.addSql(`DROP TYPE IF EXISTS "order_set_status_enum";`);
  }

}

