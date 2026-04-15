/**
 * Shared date formatting utilities
 * Used across admin and store APIs for consistent date formatting
 * All dates are formatted in server timezone (IST) using date-fns
 */

import { format } from 'date-fns'

/**
 * Formats a date value to ISO-like string in server timezone (IST)
 * date-fns format() automatically uses server's local timezone
 * @param value - Date value (string, number, Date, or null/undefined)
 * @returns ISO-like string representation (YYYY-MM-DDTHH:mm:ss) in server timezone, or empty string if invalid
 */
export const formatDate = (value?: string | number | Date | null) => {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  // Format in server timezone (IST) - date-fns uses local timezone automatically
  // Format as ISO-like string: YYYY-MM-DDTHH:mm:ss
  return format(date, "yyyy-MM-dd'T'HH:mm:ss")
}

/**
 * Formats a date to YYYY-MM-DD HH:mm:ss format in server timezone (IST) using date-fns
 * date-fns format() automatically uses server's local timezone
 * @param date - Date value (Date object or string)
 * @returns Formatted date string in YYYY-MM-DD HH:mm:ss format (server timezone), or empty string if invalid
 */
export const formatDates = (date?: Date | string) => {
  if (!date) return ''

  const d = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(d.getTime())) {
    return ''
  }

  // Format as YYYY-MM-DD HH:mm:ss in server timezone (IST)
  // date-fns format() automatically uses server's local timezone
  return format(d, 'yyyy-MM-dd HH:mm:ss')
}

/** Customer-facing date + time (server TZ via date-fns), e.g. return tracking. */
export const formatDateTimeDisplay = (
  value?: string | number | Date | null
): string | null => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : format(d, 'MMM d, yyyy, h:mm a')
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string (e.g., "30s", "5m 30s", "2h 15m")
 */
export const formatDuration = (durationMs: number): string => {
  const seconds = Math.floor(durationMs / 1000)

  if (seconds < 60) {
    return `${seconds}s`
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

