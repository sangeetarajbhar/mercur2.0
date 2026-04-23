import { MedusaError } from "@medusajs/framework/utils"
import { LocationType } from "../../../../../modules/stock-location-extension/types/common"
import { getLocationHierarchiesByParent } from "../../../../../shared/utils/location-hierarchy"
import {
  fetchStockLocationExtensionsByStockLocationId,
  type StockLocationExtensionData,
} from "../../../../../modules/stock-location-extension/utils/fetch-stock-location-extensions"

type QueryLike = {
  graph: (input: Record<string, unknown>, options?: Record<string, unknown>) => Promise<{ data: any[] }>
}

type LocationHierarchy = {
  child_location_id: string
}

export type ClusterContext = {
  darkStoreLocationId: string
  childLocations: string[]
  darkStoreWithChildrenStockLocation: string[]
}

export async function resolveClusterContext(
  query: QueryLike,
  clusterId: string
): Promise<ClusterContext> {
  
  const locationExtensions = await fetchStockLocationExtensionsByStockLocationId(query, clusterId)

  const darkStoreExtensions = (locationExtensions || []).filter(
    (ext: StockLocationExtensionData) =>
      ext.stock_location_extension?.location_type === LocationType.DARK_STORE.toString()
  )

  if (!darkStoreExtensions.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Cluster Location is not a valid dark store`)
  }

  const darkStoreLocationId = darkStoreExtensions[0].stock_location_id
  const locationHierarchies = await getLocationHierarchiesByParent(query, darkStoreLocationId)
  const childLocations = locationHierarchies.map((loc: LocationHierarchy) => loc.child_location_id)

  return {
    darkStoreLocationId,
    childLocations,
    darkStoreWithChildrenStockLocation: [darkStoreLocationId, ...childLocations],
  }
}
