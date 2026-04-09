import { MedusaError } from '@medusajs/framework/utils'
import { createISTDateTime, getStartOfDayIST } from '../../../delivery-promise/utils/date-time-utils'

/**
 * Shared utility functions for delivery validation
 * Reduces code duplication and improves maintainability
 * All functions use IST timezone for consistency
 */

/**
 * Formats a Date object as HH:MM string
 */
export function formatTimeAsHHMM(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

/**
 * Parses a date string (YYYY-MM-DD) into a Date object in IST timezone
 * Returns UTC Date object representing the IST date at 00:00:00 IST
 */
export function parseDateString(dateStr: string): Date {
  // Create a date at midnight IST and return as UTC Date object
  return createISTDateTime(dateStr, '00:00:00')
}

/**
 * Creates a DateTime by combining a date string and time
 * Server is already in IST, so no conversion needed
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM or HH:MM:SS format
 * @returns Date object representing the date/time
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date
export function combineDateAndTime(date: Date, timeStr: string): Date
export function combineDateAndTime(input: Date | string, timeStr: string): Date {
  // If input is a Date object, extract the date string directly (server is already in IST)
  if (input instanceof Date) {
    const year = input.getFullYear()
    const month = String(input.getMonth() + 1).padStart(2, '0')
    const day = String(input.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    return createISTDateTime(dateStr, timeStr)
  }
  // If input is a string, use it directly
  return createISTDateTime(input, timeStr)
}

/**
 * Normalizes a date to start of day (00:00:00) in IST timezone
 * Uses timezone-aware helper from date-time-utils
 */
export function normalizeToStartOfDay(date: Date): Date {
  return getStartOfDayIST(date)
}

/**
 * Validates that a date string is today or tomorrow
 * Server is already in IST, so no conversion needed
 * @throws MedusaError if date is not today or tomorrow
 */
export function validateDateIsTodayOrTomorrow(date: Date | string, fieldName: string = 'Delivery date'): void {
  const now = new Date()
  
  // Extract today's date string directly (server is already in IST)
  const todayYear = now.getFullYear()
  const todayMonth = String(now.getMonth() + 1).padStart(2, '0')
  const todayDay = String(now.getDate()).padStart(2, '0')
  const todayStr = `${todayYear}-${todayMonth}-${todayDay}`
  
  // Extract tomorrow's date string directly
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const tomorrowYear = tomorrow.getFullYear()
  const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0')
  const tomorrowStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`

  // Get the date string to compare
  let dateStr: string
  if (date instanceof Date) {
    // Extract date string directly from Date object (server is already in IST)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    dateStr = `${year}-${month}-${day}`
  } else {
    // Assume string is already in YYYY-MM-DD format
    dateStr = date
  }

  const isToday = dateStr === todayStr
  const isTomorrow = dateStr === tomorrowStr

  if (!isToday && !isTomorrow) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must be today or tomorrow. Provided: ${dateStr}, Today: ${todayStr}`
    )
  }
}

/**
 * Validates that a datetime is in the future
 * Server is already in IST, so no conversion needed
 * @param dateTime - Date object to validate (server timezone)
 * @param fieldName - Name of the field being validated
 * @throws MedusaError if datetime has passed
 */
export function validateDateTimeIsInFuture(dateTime: Date, fieldName: string = 'Delivery end time'): void {
  const now = new Date()
  if (dateTime <= now) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} has already passed. Time: ${dateTime.toISOString()}, Current: ${now.toISOString()}`
    )
  }
}

/**
 * Constants for delivery types
 */
export const DELIVERY_TYPES = {
  STANDARD: 'standard',
  HOME_TRIAL: 'home_trial',
  SLOTTED: 'slotted' // Deprecated - kept for backward compatibility
} as const

export type DeliveryType = typeof DELIVERY_TYPES[keyof typeof DELIVERY_TYPES]

/**
 * Helper to determine if delivery is slotted (scheduled) based on slot_id
 * @param slot_id - The slot_id from delivery details
 * @returns true if slotted/scheduled, false if instant
 */
export function isSlottedDelivery(slot_id?: string | null): boolean {
  return !!(slot_id && slot_id.trim().length > 0)
}

/**
 * Helper to determine if delivery is instant based on slot_id
 * @param slot_id - The slot_id from delivery details
 * @returns true if instant, false if slotted/scheduled
 */
export function isInstantDelivery(slot_id?: string | null): boolean {
  return !isSlottedDelivery(slot_id)
}

