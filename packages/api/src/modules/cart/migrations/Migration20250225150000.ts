import { Migration } from '@mikro-orm/migrations';

/**
 * Adds a partial index on cart_line_item_adjustment (item_id) WHERE deleted_at IS NULL
 * to optimize the query in prepare-adjustments-from-promotion-actions that fetches
 * all adjustments for a cart (join cart_line_item_adjustment + cart_line_item by cart_id).
 */
export class Migration20250225150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cart_line_item_adjustment_item_id_not_deleted" ON "cart_line_item_adjustment" ("item_id") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_cart_line_item_adjustment_item_id_not_deleted";`
    );
  }
}
