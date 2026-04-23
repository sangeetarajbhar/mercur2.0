import stockLocationExtensionLink from "../../../links/stock-location-stock-location-extension"
import { CacheTTLMap, CACHE_ENABLE, QueryGraphCacheKey, UseQueryGraphStepCacheKey } from "../../../shared/utils/redisKey"

type QueryLike = {
  graph: (input: Record<string, unknown>, options?: Record<string, unknown>) => Promise<{ data: any[] }>
}

export type StockLocationExtensionData = {
  stock_location_id: string
  stock_location_extension?: {
    location_type?: string
    id?: string
  }
}

export async function fetchStockLocationExtensionsByStockLocationId(
  query: QueryLike,
  stockLocationId: string
): Promise<StockLocationExtensionData[]> {
  const { data } = await query.graph(
    {
      entity: stockLocationExtensionLink.entryPoint,
      fields: [
        "id",
        "stock_location_id",
        "stock_location_extension.location_type",
        "stock_location_extension.id",
      ],
      filters: {
        stock_location_id: stockLocationId,
      },
    },
    {
      cache: {  
        enable: CACHE_ENABLE,
        ttl: CacheTTLMap[UseQueryGraphStepCacheKey.GET_LOCATION_EXTENSION],
        key: UseQueryGraphStepCacheKey.GET_LOCATION_EXTENSION + `${stockLocationId}`,
      },
    }
  )

  return (data || []) as StockLocationExtensionData[]
}
