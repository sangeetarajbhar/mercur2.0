/**
 * Validation utilities for product variant inventory feed
 * Single Responsibility: Validates required fields for inventory feed rows
 */

export const hasRequiredFields = (
  variantId: string,
  warehouseCode: string,
  availability: string
): boolean => {
  return !!(variantId && warehouseCode && availability)
}
