import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251202222431 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "shopify_product_variant" ("id" text not null, "sku" text not null, "shopify_variant_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shopify_product_variant_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_shopify_product_variant_sku" ON "shopify_product_variant" ("sku") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_shopify_product_variant_deleted_at" ON "shopify_product_variant" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shopify_product_variant" cascade;`)
  }
}

