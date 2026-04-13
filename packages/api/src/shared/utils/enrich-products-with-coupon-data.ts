// import {
//   calculateProductPromotions,
//   listingSellerIdFromProductPayload,
// } from "../../api/store/product-list/utils/calculate-product-promotions"
const calculateProductPromotions = async (..._args: any[]) => [] as any[]
const listingSellerIdFromProductPayload = (_product: any) => null

const DEFAULT_BEST_PRICE_TEXT = "Best Price"

interface EnrichOptions {
  customerId?: string
  bestPriceText?: string
  /** Query instance for tier filtering (same as PDP). When provided, filterPromotionsByTier uses it. */
  query?: any
}

/**
 * Enrich a list of products with couponData using calculateProductPromotions.
 *
 * - Does NOT touch YesPlz or any external search provider.
 * - Purely decorates the given product objects in-place and also returns them.
 * - Uses product.id or product.productId as the identifier.
 * - Expects a product-level price_asc field (number) for min-cart checks.
 */
export async function enrichProductsWithCouponData(
  products: any[],
  scope: any,
  options: EnrichOptions = {}
): Promise<any[]> {
  if (!Array.isArray(products) || products.length === 0) {
    return products
  }

  const bestPriceText = options.bestPriceText ?? DEFAULT_BEST_PRICE_TEXT

  // Always remove any upstream couponData (e.g. from YesPlz responses).
  // We only re-attach couponData when our eligibility logic selects a promo.
  for (const product of products) {
    if (product && typeof product === "object" && "couponData" in product) {
      try {
        delete (product as any).couponData
      } catch {
        ;(product as any).couponData = undefined
      }
    }
  }

  // Prepare products for promotion calculation
  const productsForPromotionCalc = products.map((product: any) => ({
    id: String(product.id ?? product.productId),
    price_asc: Number(product.price) || 0,
    title: product.title || null,
    // Needed so seller-based coupons can be evaluated on PLP/PDP without cart_id.
    seller_id: listingSellerIdFromProductPayload(product) ?? null,
  }))

  let promotionMap = new Map<string, any>()
  try {
    const promotionResults = await calculateProductPromotions(
      productsForPromotionCalc,
      scope,
      options.customerId,
      undefined,
      options.query
    )

    promotionMap = new Map(
      promotionResults.map((p: any) => [p.product_id, p])
    )
  } catch {
    // Fail open: if promotion calculation fails, just return products without couponData
    return products
  }

  // Attach couponData to matching products
  return products.map((product: any) => {
    if (!product || typeof product !== "object") {
      return product
    }

    const id = String(product.id ?? product.productId)
    const info = promotionMap.get(id)

    if (!info?.best_promotion_code) {
      return product
    }

    const code = info.best_promotion_code
    const discountAmount = info.discount_amount
    const bestPrice = info.discounted_price

    product.couponData = {
      couponDiscount: discountAmount,
      couponCode: code,
      couponDescription: {
        // Matches latest YesPlz-style description text
        description: `Get it for ${bestPrice} with coupon`,
        couponCode: code,
        bestPrice,
        bestPriceText: bestPriceText,
      },
    }

    return product
  })
}

