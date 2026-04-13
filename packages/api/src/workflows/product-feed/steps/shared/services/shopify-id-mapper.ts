export interface IQueryService {
  graph(query: any): Promise<{ data: any[]; metadata?: any }>
}

export interface IShopifyIdMapper {
  mapSkusToShopifyIds(
    skus: Set<string>
  ): Promise<Map<string, { productId: string; variantId: string }>>
}

export class ShopifyIdMapper implements IShopifyIdMapper {
  constructor(private query: IQueryService) {}

  async mapSkusToShopifyIds(
    skus: Set<string>
  ): Promise<Map<string, { productId: string; variantId: string }>> {
    const shopifyIdBySku = new Map<string, { productId: string; variantId: string }>()
    if (skus.size === 0) {
      return shopifyIdBySku
    }

    const { data: variantExtensions } = await this.query.graph({
      entity: "shopify_product_variant",
      fields: ["sku", "shopify_product_id", "shopify_variant_id"],
      filters: { sku: Array.from(skus) },
    })

    for (const ext of variantExtensions as any[]) {
      if (!ext?.sku) continue
      shopifyIdBySku.set(ext.sku, {
        productId: ext.shopify_product_id || "",
        variantId: ext.shopify_variant_id || "",
      })
    }

    return shopifyIdBySku
  }
}

