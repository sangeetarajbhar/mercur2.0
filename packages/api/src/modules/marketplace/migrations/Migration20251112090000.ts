import { Migration } from '@mikro-orm/migrations';

export class Migration20251112090000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "order_set"
      ADD COLUMN IF NOT EXISTS "rider_assigned_at" timestamptz(6) NULL,
      ADD COLUMN IF NOT EXISTS "metadata" jsonb NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "order_set"
      DROP COLUMN IF EXISTS "rider_assigned_at",
      DROP COLUMN IF EXISTS "metadata";
    `);
  }

}


