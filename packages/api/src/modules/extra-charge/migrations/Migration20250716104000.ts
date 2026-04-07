import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250716104000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "extra_charge_rule" ADD COLUMN "values_new" text[] NOT NULL DEFAULT '{}'::text[];`
    )
    this.addSql(
      `UPDATE "extra_charge_rule" SET "values_new" = CASE WHEN jsonb_typeof("values") = 'array' THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text("values") AS value) ELSE ARRAY["values"::text] END;`
    )
    this.addSql(`ALTER TABLE "extra_charge_rule" DROP COLUMN "values";`)
    this.addSql(`ALTER TABLE "extra_charge_rule" RENAME COLUMN "values_new" TO "values";`)
  }

  async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "extra_charge_rule" ADD COLUMN "values_new" jsonb NOT NULL DEFAULT '[]'::jsonb;`
    )
    this.addSql(`UPDATE "extra_charge_rule" SET "values_new" = to_jsonb("values");`)
    this.addSql(`ALTER TABLE "extra_charge_rule" DROP COLUMN "values";`)
    this.addSql(`ALTER TABLE "extra_charge_rule" RENAME COLUMN "values_new" TO "values";`)
  }
}
