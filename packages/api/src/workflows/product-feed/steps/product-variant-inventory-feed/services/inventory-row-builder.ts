/**
 * Inventory Row Builder Service
 * Single Responsibility: Builds CSV rows for inventory feed
 *
 * Legacy (Shopify composite id only): `buildRows(feedId, perLocation, locationById, variant)` — see commented block in
 * `get-product-variant-inventory-feed-items.ts`.
 */

import type { IInventoryRowBuilder } from "../types"
import { escapeCsvValue } from "../../shared/csv-utils"
import { hasRequiredFields } from "../utils/validation"

export class InventoryRowBuilder implements IInventoryRowBuilder {
  buildRows(
    variantId: string,
    perLocation: Map<string, { stocked: number; reserved: number }>,
    locationById: Map<string, any>,
    variant: any
  ): string[] {
    const rows: string[] = []

    if (perLocation.size === 0) {
      // If no inventory levels, still emit a single row with empty region id
      // const stockStatus = !variant.manage_inventory
      //   ? "in_stock"
      //   : "out_of_stock"

      // const row = [
      //   escapeCsvValue(feedId),
      //   escapeCsvValue(""),
      //   escapeCsvValue(stockStatus),
      // ].join(",")
      // rows.push(row)

      return rows
    }

    // Create a row per stock location
    for (const [locId, inv] of perLocation.entries()) {
      const location = locationById.get(locId)
      const availableQty = inv.stocked - inv.reserved

      const stockStatus = !variant.manage_inventory
        ? "in_stock"
        : availableQty > 0
        ? "in_stock"
        : "out_of_stock"

      const warehouseCode =
        location?.stock_location_section?.partner_wh_code || ""

      // Validate required fields before adding row
      if (!hasRequiredFields(variantId, warehouseCode, stockStatus)) {
        continue
      }

      const row = [
        escapeCsvValue(variantId),
        escapeCsvValue(warehouseCode),
        escapeCsvValue(stockStatus),
      ].join(",")
      rows.push(row)
    }

    return rows
  }
}
