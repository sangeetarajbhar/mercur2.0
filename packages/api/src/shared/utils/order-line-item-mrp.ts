import { roundToTwoDecimals } from './calculate-discount-amount'

/**
 * Placed order line fields for MRP / seller discount (`compare_at_unit_price`, `unit_price`, `quantity`).
 */
export type OrderLineItemPricingInput = Record<string, unknown>

export function getLineItemMrpAndSellerDiscount(
  item: OrderLineItemPricingInput
): {
  item_mrp_total: number
  item_seller_discount_total: number
} {
  const qty = Number(item.quantity) || 0
  const mrpUnit = Number(item.compare_at_unit_price ?? item.unit_price) || 0
  const unitPrice = Number(item.unit_price) || 0
  const mrpRaw = mrpUnit * qty
  const sellingRaw = unitPrice * qty
  return {
    item_mrp_total: roundToTwoDecimals(mrpRaw),
    item_seller_discount_total: Math.max(
      0,
      roundToTwoDecimals(mrpRaw - sellingRaw)
    ),
  }
}

/**
 * Order-set level: sum raw amounts, then round once (not the same as summing per-line rounded totals).
 */
export function aggregateItemsMrpAndSellerDiscount(
  items: readonly OrderLineItemPricingInput[]
): {
  items_mrp_total: number
  items_seller_discount_total: number
} {
  let mrpRaw = 0
  let sellingRaw = 0
  for (const item of items) {
    const qty = Number(item.quantity) || 0
    mrpRaw += (Number(item.compare_at_unit_price ?? item.unit_price) || 0) * qty
    sellingRaw += (Number(item.unit_price) || 0) * qty
  }
  return {
    items_mrp_total: roundToTwoDecimals(mrpRaw),
    items_seller_discount_total: Math.max(
      0,
      roundToTwoDecimals(mrpRaw - sellingRaw)
    ),
  }
}
