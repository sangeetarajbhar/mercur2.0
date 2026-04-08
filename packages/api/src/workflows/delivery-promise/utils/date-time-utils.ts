/**
 * Date and Time Utilities for IST (Indian Standard Time)
 * 
 * This module provides IST utilities. The server is configured to run in IST timezone.
 */

/**
 * Helper to parse HH:MM time string into hours and minutes
 * @param hhmm - Time string in HH:MM format
 * @returns Object with h (hours) and m (minutes) or null if invalid
 */
export function parseHHMM(hhmm?: string | null): { h: number; m: number } | null {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(x => parseInt(x, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return { h, m }
}

/**
 * Helper to set time on a date
 * @param d - Base date
 * @param h - Hours to set
 * @param m - Minutes to set
 * @returns New date with the specified time
 */
export function withTime(d: Date, h: number, m: number): Date {
  const nd = new Date(d)
  nd.setHours(h, m, 0, 0)
  return nd
}

/**
 * Helper to add minutes to a date
 * @param d - Base date
 * @param mins - Number of minutes to add
 * @returns New date with minutes added
 */
export function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60000)
}

/**
 * Helper to format time in a user-friendly way
 * @param d - Date to format
 * @returns Formatted time string (e.g., "2 PM")
 */
export function formatToHrTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric' }).toUpperCase()
}

/**
 * Convert to IST date (server is already in IST, so returns date as-is)
 * @param date - Input date
 * @returns Date in IST timezone
 */
export function toIST(date: Date): Date {
  // Server is already in IST, return as-is
  return new Date(date)
}

/**
 * Get today's date string in IST (YYYY-MM-DD)
 * @param date - Input date
 * @returns Date string in IST timezone (YYYY-MM-DD)
 */
export function getTodayIST(date: Date): string {
  // Server is in IST, use local date methods
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get tomorrow's date string in IST (YYYY-MM-DD)
 * @param date - Input date
 * @returns Tomorrow's date string in IST timezone (YYYY-MM-DD)
 */
export function getTomorrowIST(date: Date): string {
  // Server is in IST, use local date methods
  const tomorrow = new Date(date)
  tomorrow.setDate(date.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normalize date to start of day in IST (non-mutating)
 * @param date - Date to normalize
 * @returns New date set to start of day in IST (00:00:00.000 IST)
 */
export function getStartOfDayIST(date: Date): Date {
  // Server is in IST, use local methods
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

/**
 * Create a Date object from date string and time in IST timezone
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM or HH:MM:SS format (IST)
 * @returns Date object representing the IST date/time
 */
export function createISTDateTime(dateStr: string, timeStr: string): Date {
  const timeWithSeconds = timeStr.length === 5 ? `${timeStr}:00` : timeStr
  
  // Server is in IST, create date using local methods
  // Parse YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number)
  // Parse HH:MM:SS
  const [hours, minutes, seconds] = timeWithSeconds.split(':').map(Number)
  // Create date in local IST timezone
  return new Date(year, month - 1, day, hours, minutes, seconds, 0)
}

