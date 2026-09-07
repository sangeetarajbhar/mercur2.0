import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251209152000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "shopify_product_variant" add column if not exists "shopify_product_id" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "shopify_product_variant" drop column if exists "shopify_product_id";`
    )
  }
}

