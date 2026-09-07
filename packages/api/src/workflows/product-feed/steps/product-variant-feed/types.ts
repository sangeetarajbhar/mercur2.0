/**
 * Types and interfaces for product variant feed generation
 * Following Dependency Inversion Principle - depend on abstractions
 */

export type VariantFeedItem = {
  /** Medusa variant id — exported as CSV column `id` (Google / Adyogi). */
  variant_id: string
  /** Medusa product id — exported as CSV column `item_group_id`. */
  product_id: string
  // Legacy Shopify composite `id` (re-enable with commented code in variant-processor + constants):
  // Shopify_IN_ID_Variant: string
  title: string
  description: string
  link: string
  image_link?: string
  additional_image_link?: string
  availability: string
  price: string
  sale_price?: string
  sku?: string
  brand?: string
  /** Same value as the gender segment in `custom label 0` / `gender_product` (from `getProductGender`, default unisex). */
  gender: string
  gender_product?: string
  product_type?: string
  color?: string
  size?: string
  gtin?: string
  identifier?: string
}

export type ColumnDef = {
  id: string
  header: string
  getter: (item: VariantFeedItem) => string | number | null | undefined
}

export type StepInput = {
  filePath: string
  loop?: number
  page_size?: number
}

export interface IQueryService {
  graph(query: any): Promise<{ data: any[]; metadata?: any }>
}

// Re-export shared interface
export type { IStreamWriter } from "../shared/services/stream-writer"

export interface ILocationResolver {
  resolveLocationIds(): Promise<string[]>
}

// Re-export shared interface
export type { IShopifyIdMapper } from "../shared/services/shopify-id-mapper"

export interface IVariantProcessor {
  processVariant(
    variant: any,
    product: any,
    // shopifyIds: Map<string, { productId: string; variantId: string }>,
    locationIds: string[],
    regionId: string,
    currencyCode: string,
    storefrontUrl: string
  ): Promise<VariantFeedItem | null>
}

export interface ICsvRowBuilder {
  buildRow(item: VariantFeedItem): string
  buildBatch(rows: string[]): string
}
