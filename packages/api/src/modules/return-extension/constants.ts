/**
 * Allowed timestamp columns on `return_extension`.
 * Add a nullable `model.dateTime()` on the model + migration + list the key here.
 */
export const RETURN_EXTENSION_DATE_COLUMNS = ["out_for_pickup_at"] as const

export type ReturnExtensionDateColumn =
  (typeof RETURN_EXTENSION_DATE_COLUMNS)[number]

export const RETURN_EXTENSION_DATE_COLUMN_SET = new Set<string>(
  RETURN_EXTENSION_DATE_COLUMNS
)

/**
 * Maps API `status` (e.g. OUT_FOR_PICKUP) to DB column `out_for_pickup_at`.
 * If `status` already ends with `_at`, it is treated as the full column name (lowercased).
 */
export function statusToDateColumnName(status: string): string {
  const trimmed = status.trim()
  if (!trimmed) {
    return ""
  }
  const lower = trimmed.toLowerCase().replace(/\s+/g, "_")
  if (lower.endsWith("_at")) {
    return lower
  }
  return `${lower}_at`
}
