/**
 * Utility functions for product variant feed generation
 * Single Responsibility Principle - pure utility functions
 */

export const formatPrice = (price: number, currency_code: string = "INR"): string => {
  return `${new Intl.NumberFormat("en-US", {
    currency: currency_code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)} ${currency_code.toUpperCase()}`
}
