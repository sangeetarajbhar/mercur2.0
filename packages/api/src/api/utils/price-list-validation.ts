import { MedusaError } from '@medusajs/framework/utils'
import { 
  FIXED_PRICE_LIST_END_DATE, 
  FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX, 
  NOT_ALLOWED_PRICE_VALUE 
} from '../../config/fixed-price-list'

/**
 * Shared validation utilities for price-list creation
 */

/**
 * Parse date string in DD-MM-YYYY HH:mm:ss format or ISO format
 */
export function parseCustomDateString(dateString: string): Date {
  // Check if it's a strict ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  // This prevents ambiguous dates like "02-10-2025" from being misparsed
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
  
  if (iso8601Regex.test(dateString)) {
    const isoDate = new Date(dateString)
    if (!isNaN(isoDate.getTime())) {
      return isoDate
    }
  }
  
  // Parse DD-MM-YYYY HH:mm:ss format
  const [datePart, timePart] = dateString.split(' ')
  const [day, month, year] = datePart.split('-').map(Number)
  const [hours, minutes, seconds] = (timePart || '00:00:00').split(':').map(Number)
  
  return new Date(year, month - 1, day, hours, minutes, seconds)
}

/**
 * Validates start and end dates according to business rules
 * @param startDate - Start date string
 * @param endDate - End date string
 * @param allowAsapStartDate - If true, allows start date from today (ASAP). If false, requires next day onwards. Defaults to false.
 */
export function validatePriceListDates(startDate: string, endDate: string, allowAsapStartDate: boolean = false): void {
  const start = parseCustomDateString(startDate)
  const end = parseCustomDateString(endDate)
  const now = new Date()
  
  // Rule 2: Start date validation - depends on allowAsapStartDate flag
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfStartDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  
  if (allowAsapStartDate) {
    // Allow ASAP: Start date must be today or in the future (no past dates)
    if (startOfStartDate < startOfToday) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Start date cannot be in the past. Please select today or a future date.'
      )
    }
  } else {
    // Default: Start date must be from next day onwards (no current date or past dates)
    if (startOfStartDate <= startOfToday) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Start date must be from next day onwards. Please select a date from tomorrow.'
      )
    }
  }
  
  // Rule 1: End date must not exceed FIXED_PRICE_LIST_END_DATE days after start date
  const diffInTime = end.getTime() - start.getTime()
  const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24))
  
  if (diffInDays > FIXED_PRICE_LIST_END_DATE) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `End date cannot exceed ${FIXED_PRICE_LIST_END_DATE} days after start date. Current gap is ${diffInDays} days.`
    )
  }
  
  // Rule 3: Start date and end date cannot be the same
  const startOfEndDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  
  if (startOfStartDate.getTime() === startOfEndDate.getTime()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Start date and end date cannot be the same. Please select different dates.'
    )
  }
  
  if (end <= start) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'End date must be after start date.'
    )
  }
}

/**
 * Validates discount value according to business rules
 */
export function validateDiscountValue(
  discount: number, 
  discountType: 'FlatPercent' | 'FlatAmount',
  originalPrice?: number
): void {
  // Rule 3: Discount cannot exceed FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX%
  if (discountType === 'FlatPercent') {
    if (discount > FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Discount percentage cannot exceed ${FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX}%. Provided: ${discount}%`
      )
    }
    if (discount < NOT_ALLOWED_PRICE_VALUE) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Discount percentage cannot be negative.'
      )
    }
  } else if (discountType === 'FlatAmount') {
    if (originalPrice && discount > originalPrice * (FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX / 100)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Flat amount discount cannot exceed ${FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX}% of original price. Maximum allowed: ${originalPrice * (FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX / 100)}`
      )
    }
    if (discount < NOT_ALLOWED_PRICE_VALUE) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Discount amount cannot be negative.'
      )
    }
  }
}

/**
 * Validates price value according to business rules
 */
export function validatePriceValue(amount: number): void {
  // Rule 4: Price value cannot be NOT_ALLOWED_PRICE_VALUE
  if (amount <= NOT_ALLOWED_PRICE_VALUE) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Price value must be greater than ${NOT_ALLOWED_PRICE_VALUE}.`
    )
  }
}

/**
 * Validates percentage discount value
 */
export function validatePercentageDiscount(percentage: number): void {
  if (percentage < NOT_ALLOWED_PRICE_VALUE || percentage > FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Percentage discount must be between ${NOT_ALLOWED_PRICE_VALUE} and ${FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX}%. Provided: ${percentage}%`
    )
  }
}


/**
 * Comprehensive validation for price list entries
 */
export function validatePriceListEntry(entry: {
  amount: number
  percentage_discount?: number
}): void {
  validatePriceValue(entry.amount)
  
  if (entry.percentage_discount !== undefined) {
    validatePercentageDiscount(entry.percentage_discount)
  }
}
