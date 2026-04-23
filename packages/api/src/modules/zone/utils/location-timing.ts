import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import stockLocationStockLocationExtension from "../../../links/stock-location-stock-location-extension"
import { CACHE_ENABLE, CacheTTLMap, QueryGraphCacheKey } from "../../../shared/utils/redisKey"

export interface LocationTiming {
  start_time: string | null
  end_time: string | null
}

export async function fetchLocationTiming(
  scope: { resolve: (key: string) => unknown },
  locationId: string
): Promise<LocationTiming> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as any
  console.log("fetchLocationTiming", locationId)
  try {
    const { data: locationExtensions } = await query.graph({
      entity: stockLocationStockLocationExtension.entryPoint,
      fields: ["id", "stock_location_extension.start_time", "stock_location_extension.end_time"],
      filters: { stock_location_id: locationId },
    },
    {
      cache: {
        enable: CACHE_ENABLE,
        ttl: CacheTTLMap[QueryGraphCacheKey.GET_LOCATION_EXTENSION_TIME],
        key: QueryGraphCacheKey.GET_LOCATION_EXTENSION_TIME + `${locationId}`,
      },
    }
  )

    if (!locationExtensions || locationExtensions.length === 0) {
      return {
        start_time: null,
        end_time: null,
      }
    }

    const extension = locationExtensions[0]
    return {
      start_time: extension?.stock_location_extension?.start_time || null,
      end_time: extension?.stock_location_extension?.end_time || null,
    }
    
  } catch {
    return {
      start_time: null,
      end_time: null,
    }
  }
}
