/**
 * Pricing Calculator Service
 * Single Responsibility: Calculates effective prices for variants
 */

export class PricingCalculator {
  static calculateEffectivePrice(variant: any): { effectivePrice: number; effectiveSaleAmount: number } {
    const sellerPriceKeys = Object.keys(variant.calculated_price?.seller_prices || {})
    const trueMiniumumPriceSellerId =
      variant.calculated_price?.min_price_seller_id ||
      sellerPriceKeys[0] ||
      null

    const sellerPriceEntry =
      trueMiniumumPriceSellerId &&
      variant.calculated_price?.seller_prices?.[trueMiniumumPriceSellerId]

    const currentAmount =
      sellerPriceEntry?.calculated_amount ??
      variant.calculated_price?.calculated_amount ??
      variant.calculated_price?.amount ??
      0

    const mrpAmount =
      sellerPriceEntry?.original_amount ??
      variant.calculated_price?.original_amount ??
      currentAmount

    const effectivePrice = mrpAmount || 0
    const effectiveSaleAmount =
      currentAmount && currentAmount < mrpAmount ? currentAmount : effectivePrice

    return { effectivePrice, effectiveSaleAmount }
  }
}
