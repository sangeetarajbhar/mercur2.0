/**
 * Feed Transformer Utility
 * Transforms Google product feeds to Meta product feeds
 * - Renames "id" column to "google_id"
 * - Renames "sku" column to "id" for Meta feed compatibility
 */

import { parse } from "csv-parse/sync"
import { escapeCsvValue } from "./csv-utils"

/**
 * Transforms a Google product feed CSV to Meta product feed format
 * @param csv - The CSV content from Google feed
 * @returns The transformed CSV content for Meta feed
 */
export function transformGoogleFeedToMetaFeed(csv: string): string {
  if (!csv?.trim()) return csv

  const [headerLine, ...rest] = csv.split(/\r?\n/)
  if (!headerLine) return csv

  try {
    const headers = parse(headerLine, { bom: true })[0] as string[]

    const renamed = headers.map((h) => {
      const lower = h.toLowerCase()
      if (lower === "id") return "google_id"
      if (lower === "sku") return "id"
      return h
    })

    const newHeaderLine = renamed.map(escapeCsvValue).join(",")

    return [newHeaderLine, ...rest].join("\n")
  } catch {
    return csv
  }
}

