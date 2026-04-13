/**
 * Shared utility functions for calculating discount amounts
 * Handles both percentage and fixed discounts with order-level and item-level support
 */

/**
 * Round to 2 decimal places (currency precision)
 * Uses proper rounding to avoid floating-point errors
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Get target_type with smart defaults:
 * - For fixed discounts: default to 'order' (entire cart discount)
 * - For percentage discounts: default to 'items' (per-item discount)
 */
export function getTargetType(applicationMethod: {
  type?: string | null
  target_type?: string | null
}): 'order' | 'items' {
  const type = applicationMethod.type || 'percentage'
  return (
    applicationMethod.target_type ||
    (type === 'fixed' ? 'order' : 'items')
  ) as 'order' | 'items'
}

/**
 * Calculate total value of eligible items for order-level discount distribution
 */
export function calculateTotalEligibleItemsValue(
  items: Array<{
    unit_price?: number | string | null
    quantity?: number | null
  }>
): number {
  let total = 0
  for (const item of items) {
    const unitPrice = typeof item.unit_price === 'number' 
      ? item.unit_price 
      : typeof item.unit_price === 'string' 
        ? parseFloat(item.unit_price) || 0 
        : 0
    const quantity = typeof item.quantity === 'number' ? item.quantity : 1
    total += roundToTwoDecimals(unitPrice * quantity)
  }
  return total
}

/**
 * Calculate discount amount for a single line item
 * 
 * @param applicationMethod - The promotion application method
 * @param itemSubtotal - The subtotal for this line item (unit_price * quantity)
 * @param totalEligibleItemsValue - Total value of all eligible items (for order-level discounts)
 * @returns The discount amount for this line item
 */
export function calculateLineItemDiscount(
  applicationMethod: {
    type?: string | null
    value?: number | string | null
    target_type?: string | null
  },
  itemSubtotal: number,
  totalEligibleItemsValue: number = 0
): number {
  const type = applicationMethod.type || 'percentage'
  const promoValue =
    typeof applicationMethod.value === 'string'
      ? parseFloat(applicationMethod.value)
      : applicationMethod.value || 0

  if (!promoValue || promoValue <= 0) {
    return 0
  }

  const targetType = getTargetType(applicationMethod)
  let discountAmount = 0

  if (type === 'percentage') {
    // Calculate percentage discount on line item subtotal
    const percentage = promoValue / 100
    const rawDiscount = itemSubtotal * percentage
    discountAmount = roundToTwoDecimals(rawDiscount)
  } else if (type === 'fixed') {
    // Check if this is order-level or item-level discount
    if (targetType === 'order') {
      // Order-level: distribute the fixed discount proportionally across items
      const proportion =
        totalEligibleItemsValue > 0 ? itemSubtotal / totalEligibleItemsValue : 0
      discountAmount = roundToTwoDecimals(promoValue * proportion)
    } else {
      // Item-level: apply fixed amount to each item
      discountAmount = roundToTwoDecimals(promoValue)
    }
  }

  return discountAmount
}

/**
 * Calculate discount amount for a line item with unit price and quantity
 * Convenience function that calculates subtotal internally
 */
export function calculateDiscountForLineItem(
  applicationMethod: {
    type?: string | null
    value?: number | string | null
    target_type?: string | null
  },
  unitPrice: number | string,
  quantity: number = 1,
  totalEligibleItemsValue: number = 0
): number {
  const price = typeof unitPrice === 'string' ? parseFloat(unitPrice) || 0 : unitPrice
  const itemSubtotal = roundToTwoDecimals(price * quantity)
  return calculateLineItemDiscount(
    applicationMethod,
    itemSubtotal,
    totalEligibleItemsValue
  )
}

