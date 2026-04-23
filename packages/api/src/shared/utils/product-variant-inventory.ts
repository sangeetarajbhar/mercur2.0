import { CACHE_ENABLE, CacheTTLMap, QueryGraphCacheKey } from "./redisKey"

type QueryLike = {
  graph: (
    input: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => Promise<{ data: any[] }>
}

export type VariantInventoryItemRow = {
  variant_id: string
  inventory_item_id: string
}

/**
 * Cached query.graph for product_variant_inventory_item by variant_id.
 */
export async function getVariantInventoryItemsByVariantId(
  query: QueryLike,
  variantId: string
): Promise<VariantInventoryItemRow[]> {
  const ttl = CacheTTLMap[QueryGraphCacheKey.FETCH_VARIANT_INVENTORY_ITEMS]

  const { data } = await query.graph(
    {
      entity: "product_variant_inventory_item",
      fields: ["variant_id", "inventory_item_id"],
      filters: { variant_id: variantId },
    },
    {
      cache: {
        enable: CACHE_ENABLE,
        ttl,
        key: QueryGraphCacheKey.FETCH_VARIANT_INVENTORY_ITEMS + `${variantId}`,
      },
    }
  )

  return (data || []) as VariantInventoryItemRow[]
}
