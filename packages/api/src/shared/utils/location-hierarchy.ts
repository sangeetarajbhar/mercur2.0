import { CACHE_ENABLE, CacheTTLMap, QueryGraphCacheKey } from "./redisKey"

type QueryLike = {
  graph: (input: Record<string, unknown>, options?: Record<string, unknown>) => Promise<{ data: any[] }>
}

export type LocationHierarchyRow = {
  id: string
  parent_location_id: string
  child_location_id: string
}

export async function getLocationHierarchiesByParent(
  query: QueryLike,
  parentLocationId: string
): Promise<LocationHierarchyRow[]> {
  const ttl = CacheTTLMap[QueryGraphCacheKey.GET_LOCATION_HIERARCHIES]

  const { data } = await query.graph(
    {
      entity: "location_hierarchy",
      fields: ["id", "parent_location_id", "child_location_id"],
      filters: { parent_location_id: parentLocationId },
    },
    {
      cache: {
        enable: CACHE_ENABLE,
        ttl,
        key: QueryGraphCacheKey.GET_LOCATION_HIERARCHIES + `${parentLocationId}`,
      },
    }
  )

  return (data || []) as LocationHierarchyRow[]
}

/**
 * Extra promise minutes for omni fulfilment: `location_hierarchy` row linking parent DS
 * to resolved omni child. If no row or invalid value, returns 0.
 */
export async function getOmniExtraPromiseMinutesForDsAndChild(
  query: QueryLike,
  parentDsLocationId: string,
  childOmniLocationId: string
): Promise<number> {
  const ttl = CacheTTLMap[QueryGraphCacheKey.GET_LOCATION_HIERARCHY_OMNI_PROMISE]

  const { data } = await query.graph(
    {
      entity: "location_hierarchy",
      fields: ["promise_minutes"],
      filters: {
        parent_location_id: parentDsLocationId,
        child_location_id: childOmniLocationId,
        deleted_at: null,
      },
    },
    {
      cache: {
        enable: CACHE_ENABLE,
        ttl,
        key:
          QueryGraphCacheKey.GET_LOCATION_HIERARCHY_OMNI_PROMISE +
          `${parentDsLocationId}_${childOmniLocationId}`,
      },
    }
  )

  const row = data?.[0] as { promise_minutes?: unknown } | undefined
  const minutes = row?.promise_minutes
  if (typeof minutes === "number" && Number.isFinite(minutes)) {
    return Math.max(0, minutes)
  }
  return 0
}
