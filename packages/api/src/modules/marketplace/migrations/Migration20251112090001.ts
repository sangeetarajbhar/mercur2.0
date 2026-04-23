import { Migration } from '@mikro-orm/migrations'

export class Migration20251112090001 extends Migration {
  override async up(): Promise<void> {
    // Create trigger function to auto-update timestamps when order_set status changes
    // CREATE OR REPLACE is already idempotent
    this.addSql(`
      CREATE OR REPLACE FUNCTION update_order_set_timestamps()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update accepted_at when status changes to ACCEPTED
        IF NEW.status = 'ACCEPTED' AND (OLD IS NULL OR OLD.status != 'ACCEPTED') AND NEW.accepted_at IS NULL THEN
          NEW.accepted_at = now();
        END IF;

        -- Update rejected_at when status changes to REJECTED
        IF NEW.status = 'REJECTED' AND (OLD IS NULL OR OLD.status != 'REJECTED') AND NEW.rejected_at IS NULL THEN
          NEW.rejected_at = now();
        END IF;

        -- Update cancelled_at when status changes to CANCELLED
        IF NEW.status = 'CANCELLED' AND (OLD IS NULL OR OLD.status != 'CANCELLED') AND NEW.cancelled_at IS NULL THEN
          NEW.cancelled_at = now();
        END IF;

        -- Update packed_at when status changes to PACKED
        IF NEW.status = 'PACKED' AND (OLD IS NULL OR OLD.status != 'PACKED') AND NEW.packed_at IS NULL THEN
          NEW.packed_at = now();
        END IF;

        -- Update shipped_at when status changes to SHIPPED
        IF NEW.status = 'SHIPPED' AND (OLD IS NULL OR OLD.status != 'SHIPPED') AND NEW.shipped_at IS NULL THEN
          NEW.shipped_at = now();
        END IF;

        -- Update delivered_at when status changes to DELIVERED
        IF NEW.status = 'DELIVERED' AND (OLD IS NULL OR OLD.status != 'DELIVERED') AND NEW.delivered_at IS NULL THEN
          NEW.delivered_at = now();
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)

    // Drop trigger if it exists, then create it (PostgreSQL doesn't support CREATE TRIGGER IF NOT EXISTS)
    this.addSql(`
      DROP TRIGGER IF EXISTS trigger_update_order_set_timestamps ON "order_set";
    `)

    // Create trigger that calls the function before UPDATE on order_set
    this.addSql(`
      CREATE TRIGGER trigger_update_order_set_timestamps
      BEFORE UPDATE ON "order_set"
      FOR EACH ROW
      EXECUTE FUNCTION update_order_set_timestamps();
    `)
  }

  override async down(): Promise<void> {
    // Drop the trigger
    this.addSql(`DROP TRIGGER IF EXISTS trigger_update_order_set_timestamps ON "order_set";`)
    
    // Drop the trigger function
    this.addSql(`DROP FUNCTION IF EXISTS update_order_set_timestamps();`)
  }
}

