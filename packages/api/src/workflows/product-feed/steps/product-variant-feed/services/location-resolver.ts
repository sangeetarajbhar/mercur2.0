/**
 * Location Resolver Service
 * Single Responsibility: Resolves dark store location IDs
 */

import type { ILocationResolver, IQueryService } from "../types"
import { LocationType } from "../../../../../modules/stock-location-extension/types/common"

export class LocationResolver implements ILocationResolver {
  constructor(
    private query: IQueryService,
    private container: any
  ) {}

  async resolveLocationIds(): Promise<string[]> {
    const { data: extensions } = await this.query.graph({
      entity: "stock_location_extension",
      fields: ["id", "location_type"],
      filters: {
        location_type: LocationType.DARK_STORE.toString(),
      },
    })

    if (!extensions || extensions.length === 0) {
      return []
    }

    const extensionIds = extensions.map((e: any) => e.id).filter(Boolean)

    const { data: darkStores } = await this.query.graph({
      entity: "stock_location_stock_location_extension",
      fields: ["stock_location_id", "stock_location_extension_id"],
      filters: {
        stock_location_extension_id: extensionIds,
      },
    })

    if (!darkStores || darkStores.length === 0) {
      return []
    }

    const darkStoreIds = darkStores.map((d: any) => d.stock_location_id).filter(Boolean)

    const { data: locationHierarchies } = darkStoreIds.length
      ? await this.query.graph({
          entity: "location_hierarchy",
          fields: ["parent_location_id", "child_location_id"],
          filters: { parent_location_id: darkStoreIds },
        })
      : { data: [] }

    const childLocationIds = (locationHierarchies || []).map((h: any) => h.child_location_id).filter(Boolean)
    return [...darkStoreIds, ...childLocationIds].filter(Boolean)
  }
}
