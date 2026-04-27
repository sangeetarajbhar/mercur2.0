/**
 * Feed ID Builder Service
 * Single Responsibility: Builds stable feed row ids (Shopify legacy or Medusa fallback)
 */

export type MedusaProductVariantIds = {
  productId: string
  variantId: string
}

export class FeedIdBuilder {
  /**
   * Prefer `shopify_IN_*` when SKU maps to Shopify; else `zilo_IN_${variantId}` from Medusa (variant id only for shorter Google feed ids).
   */
  static buildFeedId(
    shopifyIds: { productId: string; variantId: string } | undefined,
    medusa: MedusaProductVariantIds
  ): string | undefined {
    const shopifyProductId = shopifyIds?.productId?.trim()
    const shopifyVariantId = shopifyIds?.variantId?.trim()
    if (shopifyProductId && shopifyVariantId) {
      return `shopify_IN_${shopifyProductId}_${shopifyVariantId}`
    }

    const variantId = medusa.variantId?.trim()
    if (variantId) {
      return `zilo_IN_${variantId}`
    }

    return undefined
  }
}
