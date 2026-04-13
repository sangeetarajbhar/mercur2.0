import { model } from "@medusajs/framework/utils"

// Standalone table that stores the mapping from Medusa variant SKU to Shopify variant ID.
// Model name is used as the Query.graph entity: "shopify_product_variant".
export const ShopifyProductVariant = model.define("shopify_product_variant", {
  id: model.id().primaryKey(),
  // SKU coming from Shopify Variant – used as the join key from Medusa variant.sku
  // Marked unique so a unique index is generated on this column.
  sku: model.text().unique("IDX_shopify_product_variant_sku"),
  shopify_product_id: model.text().nullable(),
  // Shopify variant identifier we ultimately want to surface in feeds
  shopify_variant_id: model.text(),
})

