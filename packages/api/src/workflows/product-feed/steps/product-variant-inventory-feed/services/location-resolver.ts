/**
 * Location Resolver Service
 * Single Responsibility: Resolves stock locations by IDs
 */

import type { ILocationResolver, IQueryService } from "../types"

export class LocationResolver implements ILocationResolver {
  constructor(private query: IQueryService) {}

  async resolveLocationsByIds(locationIds: Set<string>): Promise<Map<string, any>> {
    if (locationIds.size === 0) {
      return new Map()
    }

    const { data: locations } = await this.query.graph({
      entity: "stock_location",
      fields: [
        "id",
        "stock_location_section.partner_wh_code",
      ],
      filters: {
        id: Array.from(locationIds),
      },
    })

    return new Map(
      (locations || []).map((loc: any) => [loc.id, loc])
    )
  }
}
