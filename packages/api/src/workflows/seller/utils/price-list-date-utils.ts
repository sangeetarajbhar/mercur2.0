/**
 * Shared date parsing helpers for seller price list CSV import.
 *
 * Keep these utilities framework-agnostic so they can be reused by:
 * - workflow steps (e.g. parsePriceListCsvStep)
 * - background subscribers
 */

export function cleanDateString(str?: string): string | undefined {
  return str
    ?.toString()
    .trim()
    .replace(/\r/g, "") // remove carriage returns
    .replace(/\n/g, "") // remove line breaks
    .replace(/\uFEFF/g, "") // remove BOM if present
}

/**
 * Convert an input date string to ISO, supporting:
 * - DD-MM-YYYY
 * - any Date-parsable string
 */
export function safeToIso(input?: string): string | null {
  const cleaned = cleanDateString(input)
  if (!cleaned) return null

  // Handle DD-MM-YYYY
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/
  const match = cleaned.match(ddmmyyyy)

  if (match) {
    const [, day, month, year] = match
    const isoLike = `${year}-${month}-${day}` // convert to YYYY-MM-DD
    const date = new Date(isoLike)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  // Handle ISO & other valid formats
  const date = new Date(cleaned)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

