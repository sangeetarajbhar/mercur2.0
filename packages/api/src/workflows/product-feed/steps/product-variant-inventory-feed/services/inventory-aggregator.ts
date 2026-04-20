/**
 * Inventory Aggregator Service
 * Single Responsibility: Aggregates inventory quantities by location
 */

import type { IInventoryAggregator } from "../types"

export class InventoryAggregator implements IInventoryAggregator {
  aggregateInventoryByLocation(variant: any): Map<string, { stocked: number; reserved: number }> {
    const perLocation = new Map<string, { stocked: number; reserved: number }>()

    for (const invItem of (variant as any).inventory_items || []) {
      for (const level of invItem.inventory?.location_levels || []) {
        const locId = level.location_id
        if (!locId) continue

        const entry = perLocation.get(locId) || { stocked: 0, reserved: 0 }
        entry.stocked += level.stocked_quantity || 0
        entry.reserved += level.reserved_quantity || 0
        perLocation.set(locId, entry)
      }
    }

    return perLocation
  }
}
