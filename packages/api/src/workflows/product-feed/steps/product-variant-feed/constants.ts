/**
 * Column definitions for product variant feed CSV
 * Open/Closed Principle - easy to extend with new columns
 */

import type { ColumnDef } from "./types"

export const ALL_COLUMNS: ColumnDef[] = [
  // Legacy: single `id` column = shopify_IN_* / zilo_IN_* (requires VariantFeedItem.Shopify_IN_ID_Variant)
  // { id: "Shopify_IN_ID_Variant", header: "id", getter: (item) => item.Shopify_IN_ID_Variant },
  { id: "variant_id", header: "id", getter: (item) => item.variant_id },
  { id: "item_group_id", header: "item_group_id", getter: (item) => item.product_id },
  { id: "sku", header: "sku", getter: (item) => item.sku ?? "" },
  { id: "title", header: "title", getter: (item) => item.title },
  { id: "description", header: "description", getter: (item) => item.description ?? "" },
  { id: "condition", header: "condition", getter: () => "new" },
  { id: "link", header: "link", getter: (item) => item.link },
  { id: "image_link", header: "image_link", getter: (item) => item.image_link },
  { id: "additional_image_link_1", header: "additional_image_link", getter: (item) => item.additional_image_link?.split(",")[0] || "" },
  { id: "additional_image_link_2", header: "additional_image_link", getter: (item) => item.additional_image_link?.split(",")[1] || "" },
  { id: "additional_image_link_3", header: "additional_image_link", getter: (item) => item.additional_image_link?.split(",")[2] || "" },
  { id: "additional_image_link_4", header: "additional_image_link", getter: (item) => item.additional_image_link?.split(",")[3] || "" },
  { id: "availability", header: "availability", getter: (item) => item.availability },
  { id: "price", header: "price", getter: (item) => item.price },
  { id: "sale_price", header: "sale_price", getter: (item) => item.sale_price ?? "" },
  { id: "brand", header: "brand", getter: (item) => item.brand ?? "" },
  { id: "gender", header: "gender", getter: (item) => item.gender ?? "unisex" },
  { id: "gender_product", header: "custom label 0", getter: (item) => item.gender_product || "unisex" },
  { id: "product_type", header: "product_type", getter: (item) => item.product_type ?? "" },
  { id: "identifier", header: "identifier exists", getter: (item) => item.identifier ?? "" },
  { id: "gtin", header: "gtin", getter: (item) => item.gtin ?? "" },
  { id: "color", header: "color", getter: (item) => item.color ?? "" },
  { id: "size", header: "size", getter: (item) => item.size ?? "" },
]
