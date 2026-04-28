/**
 * Convert a date to IST (Indian Standard Time).
 * Server runs in IST, so this is effectively a clone.
 */
export function toIST(date: Date): Date {
  return new Date(date)
}

const TIMESTAMP_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
}

const SHORT_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
}

/**
 * Format a date to "dd MMM, yyyy HH:mm:ss" in IST.
 */
export function formatDateTimestamp(date?: Date | string | null): string {
  if (!date) return "–"
  const d = toIST(new Date(date))
  return new Intl.DateTimeFormat("en-IN", TIMESTAMP_FORMAT).format(d)
}

/**
 * Format a date to "dd MMM HH:mm" in IST (short form for table cells).
 */
export function formatDateShort(date?: Date | string | null): string {
  if (!date) return "–"
  const d = toIST(new Date(date))
  return new Intl.DateTimeFormat("en-IN", SHORT_FORMAT).format(d)
}
