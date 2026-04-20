/**
 * Variant Processor Service
 * Single Responsibility: Processes variants into feed items
 */

import type { IVariantProcessor, VariantFeedItem } from "../types"
import { getProductGender } from "../utils/get-product-gender"
import { getFeedImageUrls } from "../../../../../api/utils/middlewares/products/transform-image-urls"
import { formatPrice } from "../utils"
import { PricingCalculator } from "./pricing-calculator"
import { InventoryCalculator } from "./inventory-calculator"
import { AttributeExtractor } from "./attribute-extractor"

export class VariantProcessor implements IVariantProcessor {
  constructor(
    private container: any,
    private locationIds: string[],
    private regionId: string,
    private currencyCode: string,
    private storefrontUrl: string
  ) {}

  async processVariant(
    variant: any,
    product: any,
    locationIds: string[],
    regionId: string,
    currencyCode: string,
    storefrontUrl: string
  ): Promise<VariantFeedItem | null> {
    // Note: Variant is already wrapped with seller pricing in batch at the step level
    // This avoids N queries (one per variant) and instead does 1 query per batch
    const processedVariant = variant

    // Calculate pricing
    const { effectivePrice, effectiveSaleAmount } = PricingCalculator.calculateEffectivePrice(processedVariant)

    // Extract attributes (color/size)
    const { color, size } = AttributeExtractor.extractColorAndSize(processedVariant, product)

    // Calculate availability
    const stockStatus = InventoryCalculator.calculateAvailability(processedVariant)

    // Extract product metadata (gender: same source as custom label 0 prefix, no extra fetch)
    const genderValue = getProductGender(product as any)
    const gender = genderValue || "unisex"
    const productType =
      (product as any).type?.value ||
      (product as any).categories?.[0]?.name ||
      ""

    const identifier = processedVariant.ean ? "Yes" : "No"
    const { image_link, additional_image_link } = getFeedImageUrls(product as any)

    const medusaProductId = product?.id as string | undefined
    const medusaVariantId = processedVariant?.id as string | undefined
    if (!medusaProductId || !medusaVariantId) {
      return null
    }

    // Legacy Shopify composite `id` (disabled). Re-enable: pass `shopifyIds` from get-product-variant-feed-items, uncomment below, then feed `shopify_IN_ID_Variant` into CSV `id` (see constants legacy column comment).
    // const sku = processedVariant.sku as string | undefined
    // const shopifyIdMapping = sku ? shopifyIds.get(sku) : undefined
    // const mappedShopifyVariantId = shopifyIdMapping?.variantId || ""
    // const mappedShopifyProductId = shopifyIdMapping?.productId || ""
    // let shopify_IN_ID_Variant: string
    // if (mappedShopifyProductId && mappedShopifyVariantId) {
    //   shopify_IN_ID_Variant = `shopify_IN_${mappedShopifyProductId}_${mappedShopifyVariantId}`
    // } else {
    //   shopify_IN_ID_Variant = `zilo_IN_${medusaProductId}_${medusaVariantId}`
    // }

    // Google / Adyogi: CSV `id` = variant_id, `item_group_id` = product_id
    return {
      variant_id: medusaVariantId,
      product_id: medusaProductId,
      title: product.title,
      description: product.description ?? "",
      // link: `${storefrontUrl || ""}/p/${product.handle}`,
      link: `${storefrontUrl || ""}/p/${product.handle}/${product.id}?variantId=${variant.id}`,
      image_link,
      additional_image_link,
      sku: processedVariant.sku,
      availability: stockStatus,
      // MRP as price, sale_price is current minimum price (falls back to MRP when no discount)
      price: formatPrice(effectivePrice),
      sale_price: formatPrice(effectiveSaleAmount),
      brand: product.brand?.name || "",
      gender,
      gender_product: `${gender}-${productType || ""}`,
      // product_type: type/category without gender prefix
      product_type: productType || "",
      gtin: (processedVariant as any).ean || "",
      identifier: identifier,
      color,
      size,
    }
  }
}
