/**
 * CSV Row Builder Service
 * Single Responsibility: Builds CSV rows from feed items
 */

import type { ICsvRowBuilder, VariantFeedItem, ColumnDef } from "../types"
import { escapeCsvValue } from "../../shared/csv-utils"

export class CsvRowBuilder implements ICsvRowBuilder {
  constructor(private columns: ColumnDef[]) {}

  buildRow(item: VariantFeedItem): string {
    return this.columns
      .map((col) => escapeCsvValue(col.getter(item)))
      .join(",")
  }

  buildBatch(rows: string[]): string {
    return rows.join("\n") + "\n"
  }
}
