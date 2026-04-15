import { MedusaError } from '@medusajs/framework/utils'
import { startOfDay } from 'date-fns'

/**
 * Gets the default date range for last N days in IST timezone
 * Uses $gte and $lt to ensure exactly N days are selected (no +1 handling)
 * @param days - Number of days to go back (default: 7)
 * @returns Date filter object with $gte and $lt in ISO string format
 */
export const getDefaultDateRange = (days: number = 7): Record<string, string> => {
  const now = new Date()
  const endDate = startOfDay(now) // Start of today in IST
  
  // Calculate start date: subtract (days - 1) days from end date to get exactly N days
  // For 7 days: start = today - 6 days = 7 days total (including today)
  const startDateMs = endDate.getTime() - ((days - 1) * 24 * 60 * 60 * 1000)
  const startDate = new Date(startDateMs)
  const normalizedStartDate = startOfDay(startDate) // Start of day N days ago in IST
  
  // Use $lt for end date to ensure exactly N days (exclusive end)
  const nextDay = new Date(endDate)
  nextDay.setDate(nextDay.getDate() + 1)
  const normalizedNextDay = startOfDay(nextDay)
  
  return {
    $gte: normalizedStartDate.toISOString(),
    $lt: normalizedNextDay.toISOString(),
  }
}

/**
 * Validates that a date range does not exceed the specified maximum days
 * All dates are normalized to IST timezone (UTC+5:30) for consistent calculation
 * Uses exclusive end date ($lt) for exact day counts
 * @param dateFilter - The date filter object with $gte and optionally $lt, or a string
 * @param fieldName - The name of the field being validated (for error messages)
 * @param maxDays - Maximum number of days allowed in the range (default: 7)
 * @throws MedusaError if the date range exceeds maxDays
 */
export const validateDateRange = (
  dateFilter: Record<string, string> | string | undefined,
  fieldName: string,
  maxDays: number = 7
): void => {
  // Early return if no filter provided or not an object
  if (!dateFilter || typeof dateFilter !== 'object' || !dateFilter.$gte) {
    return
  }

  // Enforce exclusive end dates only
  if ((dateFilter as any).$lte) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} end date must use $lt (exclusive). $lte is not supported.`
    )
  }

  const startDate = new Date(dateFilter.$gte)
  
  // Validate start date is valid
  if (Number.isNaN(startDate.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} start date ($gte) is invalid.`
    )
  }

  // Normalize start date to start of day in IST timezone
  const normalizedStartDate = startOfDay(startDate)

  let endDate: Date
  let normalizedEndDate: Date

  // Exclusive end date
  const endDateValue = dateFilter.$lt

  if (endDateValue) {
    endDate = new Date(endDateValue)
    
    // Validate end date is valid
    if (Number.isNaN(endDate.getTime())) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${fieldName} end date ($lt) is invalid.`
      )
    }
    
    // Normalize to start of day (exclusive end)
    normalizedEndDate = startOfDay(endDate)
    
    // Ensure end date is not before start date
    if (normalizedEndDate <= normalizedStartDate) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${fieldName} end date ($lt) must be after start date ($gte).`
      )
    }
  } else {
    // If no end date provided, use start of tomorrow in IST as end date
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    normalizedEndDate = startOfDay(tomorrow)
    
    // If start date is in the future, that's invalid
    if (normalizedStartDate >= normalizedEndDate) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${fieldName} start date ($gte) cannot be in the future.`
      )
    }
  }

  // Calculate the difference in milliseconds
  const diffTime = normalizedEndDate.getTime() - normalizedStartDate.getTime()
  
  // Convert to days (no +1 handling - exact days difference)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Check if range exceeds maximum (exact days, no +1)
  if (diffDays > maxDays) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} date range cannot exceed ${maxDays} days. Selected range: ${diffDays} days.`
    )
  }
}

/**
 * Normalizes date filter values from various formats.
 * Handles string JSON, Date objects, and date filter objects with operators ($gte, $lt, $gt, etc.).
 * All dates are normalized to IST timezone using date-fns.
 * Uses $lt for end dates to ensure exact day counts (no +1 handling).
 * @param value - Date filter value (can be object, string, or other types)
 * @returns Normalized date filter object with ISO string dates
 */
export function normalizeDateFilter(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return normalizeDateFilter(parsed)
        }
      } catch {
        // ignore parse errors and fall through
      }
    }
    return value
  }

  const normalized: Record<string, string> = {}

  Object.entries(value as Record<string, string | Date>).forEach(
    ([operator, rawValue]) => {
      if (!rawValue) {
        return
      }

      const date =
        rawValue instanceof Date ? new Date(rawValue) : new Date(String(rawValue))

      if (Number.isNaN(date.getTime())) {
        return
      }

      switch (operator) {
        case '$gte':
          // Start of day in IST (inclusive start)
          normalized[operator] = startOfDay(date).toISOString()
          break
        case '$gt':
          // Start of next day in IST (exclusive start) - no +1 handling, use start of next day
          const nextDay = new Date(date)
          nextDay.setDate(nextDay.getDate() + 1)
          normalized[operator] = startOfDay(nextDay).toISOString()
          break
        case '$lt':
          // Start of day in IST (exclusive end) - preferred for exact day counts
          normalized[operator] = startOfDay(date).toISOString()
          break
        case '$lte':
          // Enforce exclusive end dates only: callers must send $lt instead.
          return
        default:
          // For other operators, just convert to ISO string
          normalized[operator] = date.toISOString()
          break
      }
    }
  )

  return normalized
}

