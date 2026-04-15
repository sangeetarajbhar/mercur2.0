import { Migration } from '@mikro-orm/migrations'

const ORDER_STATUS_ENUM = 'order_status_enum'

const ORIGINAL_STATUSES = [
  'pending',
  'completed',
  'draft',
  'archived',
  'canceled',
  'requires_action'
]

const ADDITIONAL_STATUSES = [
  'NEW',
  'ACCEPTED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
]

const FINAL_STATUSES = [...ORIGINAL_STATUSES, ...ADDITIONAL_STATUSES]

export class Migration20251107000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TYPE "${ORDER_STATUS_ENUM}" RENAME TO "${ORDER_STATUS_ENUM}_old";`)

    this.addSql(`
      CREATE TYPE "${ORDER_STATUS_ENUM}" AS ENUM (
        ${FINAL_STATUSES.map((status) => `'${status}'`).join(', ')}
      );
    `)

    this.addSql(`ALTER TABLE "order" ALTER COLUMN "status" DROP DEFAULT;`)
    this.addSql(`
      ALTER TABLE "order"
      ALTER COLUMN "status"
      TYPE "${ORDER_STATUS_ENUM}"
      USING ("status"::text::"${ORDER_STATUS_ENUM}");
    `)

    this.addSql(`DROP TYPE "${ORDER_STATUS_ENUM}_old";`)

    this.addSql(`ALTER TABLE "order" ALTER COLUMN "status" SET DEFAULT 'NEW';`)
    this.addSql(`
      UPDATE "order"
      SET "status" = 'NEW'
      WHERE "status" = 'pending';
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "order" ALTER COLUMN "status" DROP DEFAULT;`)

    this.addSql(`
      UPDATE "order"
      SET "status" = 'pending'
      WHERE "status" IN (${ADDITIONAL_STATUSES.map((status) => `'${status}'`).join(', ')});
    `)

    this.addSql(`ALTER TYPE "${ORDER_STATUS_ENUM}" RENAME TO "${ORDER_STATUS_ENUM}_new";`)

    this.addSql(`
      CREATE TYPE "${ORDER_STATUS_ENUM}" AS ENUM (
        ${ORIGINAL_STATUSES.map((status) => `'${status}'`).join(', ')}
      );
    `)

    this.addSql(`
      ALTER TABLE "order"
      ALTER COLUMN "status"
      TYPE "${ORDER_STATUS_ENUM}"
      USING ("status"::text::"${ORDER_STATUS_ENUM}");
    `)

    this.addSql(`DROP TYPE "${ORDER_STATUS_ENUM}_new";`)

    this.addSql(`ALTER TABLE "order" ALTER COLUMN "status" SET DEFAULT 'pending';`)
  }
}


