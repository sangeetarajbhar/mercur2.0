/**
 * Validation utilities for product variant feed
 * Single Responsibility: Validates required fields for feed items
 */

import type { VariantFeedItem } from "../types"

export const hasRequiredFields = (item: VariantFeedItem): boolean => {
  // Required fields: id, title, description, availability, condition, price, link, image_link, brand
  return !!(
    item.variant_id &&
    item.title &&
    item.description &&
    item.availability &&
    item.price &&
    item.link &&
    item.image_link &&
    item.brand
  )
  // condition is always "new" so it's always present
}
