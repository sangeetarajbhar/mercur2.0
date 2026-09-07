/**
 * Format promotion savings text with upper limit
 * Returns formatted message like "Save 50% using code zilo6 upto ₹500"
 * 
 * This function handles two different input formats:
 * 1. Promotion object with application_method and promotion_extension (from promotions listing)
 * 2. Product promotion result with discount_percentage/discount_amount and promo_code_upper_limit (from product routes)
 */

interface PromotionWithApplicationMethod {
  code?: string | null
  application_method?: {
    type?: string
    value?: number | string
    /** Medusa uses percentage_rate for percentage-type discounts */
    percentage_rate?: number | string
  } | null
  promotion_extension?: {
    promo_code_upper_limit?: number
    cart_sub_total?: number
    custom_tagline?: string | null
    terms_and_conditions?: string[]
  } | null
}

interface ProductPromotionResult {
  best_promotion_code?: string | null
  discount_percentage?: number
  discount_amount?: number
  promo_code_upper_limit?: number
  min_cart_value?: number
  application_method_type?: string
  application_method_value?: number
  custom_tagline?: string | null
  terms_and_conditions?: string[]
}

type PromotionInput = PromotionWithApplicationMethod | ProductPromotionResult

function formatRupees(amount: number): string {
  // Keep up to 2 decimals, but avoid trailing zeros (e.g. 300.00 -> "300")
  const rounded = Math.round(amount * 100) / 100
  if (Number.isInteger(rounded)) {
    return rounded.toFixed(0)
  }
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}



/**
 * Format promotion savings text from promotion object with application_method.
 * Uses percentage_rate for percentage type (Medusa) and value for fixed; fallback "Save using code X" when amount missing.
 */
function formatFromPromotionObject(promotion: PromotionWithApplicationMethod): string | null {
  const promotionCode = (promotion.code || "").trim()
  if (!promotionCode) {
    return null
  }

  const method = promotion.application_method
  let savingsTextValue = ""

  if (method?.type === "percentage") {
    // Medusa stores percentage in percentage_rate; fall back to value
    const raw =
      method.percentage_rate != null
        ? method.percentage_rate
        : method.value
    const percentage =
      typeof raw === "string" ? parseFloat(raw) : Number(raw) || 0
    if (percentage > 0 && percentage <= 100) {
      savingsTextValue = `${percentage}%`
    }
  } else if (method?.type === "fixed") {
    const raw = method.value
    const fixedAmount =
      typeof raw === "string" ? parseFloat(raw) : Number(raw) || 0
    if (fixedAmount > 0) {
      savingsTextValue = `₹${fixedAmount}`
    }
  }

  const upperLimit = promotion.promotion_extension?.promo_code_upper_limit
  const upperLimitText =
    upperLimit && upperLimit > 0 ? ` upto ₹${upperLimit}` : ""

  if (savingsTextValue) {
    return `Save ${savingsTextValue} using code ${promotionCode}${upperLimitText}`
  }
  // Have code but no amount (e.g. relation not loaded or invalid) — still show code
  return `Save using code ${promotionCode}${upperLimitText}`
}

/**
 * Format promotion savings text from product promotion result.
 */
function formatFromProductPromotion(promotion: ProductPromotionResult): string | null {
  const promotionCode = (promotion.best_promotion_code || "").trim()

  if (!promotionCode) {
    return null
  }

  const discountPercentage = promotion.discount_percentage || 0
  const discountAmount = promotion.discount_amount || 0

  // Determine savings text value
  let savingsTextValue = ""
  if (discountPercentage > 0) {
    savingsTextValue = `${discountPercentage}%`
  } else if (discountAmount > 0) {
    savingsTextValue = `₹${Math.max(0, Math.round(discountAmount * 100) / 100)}`
  } else {
    return null
  }

  // Add upper limit text if available
  const upperLimit = promotion.promo_code_upper_limit
  const upperLimitText =
    upperLimit && upperLimit > 0 ? ` upto ₹${upperLimit}` : ""

  return `Save ${savingsTextValue} using code ${promotionCode}${upperLimitText}`
}

/**
 * Format promotion savings text — unified function that handles both formats.
 */
export function formatPromotionSavingsText(promotion: PromotionInput): string | null {
  if ('application_method' in promotion && promotion.application_method) {
    return formatFromPromotionObject(promotion as PromotionWithApplicationMethod)
  }

  if (
    'best_promotion_code' in promotion ||
    'discount_percentage' in promotion ||
    'discount_amount' in promotion
  ) {
    return formatFromProductPromotion(promotion as ProductPromotionResult)
  }

  return null
}

/**
 * Format rupee savings text based on cart value.
 *
 * Examples:
 * - Fixed coupon (₹400): "Save rupees 400"
 * - Percentage coupon (40%): "Save rupees 300"
 *
 * Applies `promo_code_upper_limit` (if present) as a savings cap.
 */
export function formatPromotionSaveText(
  promotion: PromotionInput,
  cartValue: number,
  options?: {
    isApplied?: boolean
    appliedPromotionCount?: number
  }
): string | null {
  if (!cartValue || cartValue <= 0) {
    return null
  }

  // Listing promotion object format only (used by `/store/promotions`)
  if (!('application_method' in promotion) || !promotion.application_method) {
    return null
  }

  const promotionObj = promotion as PromotionWithApplicationMethod
  const method = promotionObj.application_method
  const upperLimit = Number(promotionObj.promotion_extension?.promo_code_upper_limit) || 0
  const isApplied = options?.isApplied === true
  const appliedPromotionCount = options?.appliedPromotionCount ?? 0

  let discount = 0
  let pct: number | null = null

  // Compute rupee savings from cart value based on discount type.
  if (method?.type === 'percentage') {
    const raw = method.percentage_rate != null ? method.percentage_rate : method.value
    pct = typeof raw === 'string' ? parseFloat(raw) : Number(raw) || 0
    if (pct > 0 && pct <= 100) {
      // If this promotion is already applied, `cartValue` likely represents the discounted
      // amount (cartBase - discount). For the listing UI, we want to keep the "expected
      // savings" constant, so we back-calculate the original cartBase using the %.
      if (isApplied && appliedPromotionCount === 1) {
        // cartValue = cartBase - min(cartBase * pct/100, upperLimit)
        // Try uncapped first; if it exceeds upperLimit, fall back to capped.
        if (pct === 100) {
          return null
        }
        const denom = 1 - pct / 100
        if (denom <= 0) {
          return null
        }

        const baseUncapped = cartValue / denom
        const savingsUncapped = (baseUncapped * pct) / 100

        // If a cap exists, final discount is capped savings; otherwise use full computed savings.
        discount = upperLimit > 0 ? Math.min(savingsUncapped, upperLimit) : savingsUncapped
      } else {
        // Not applied (or multiple promos): compute savings directly from cartValue.
        discount = (cartValue * pct) / 100
      }
    }
  } else if (method?.type === 'fixed') {
    const raw = method.value
    const fixedAmount = typeof raw === 'string' ? parseFloat(raw) : Number(raw) || 0
    if (fixedAmount > 0) {
      discount = fixedAmount
    }
  } else {
    return null
  }

  // Apply savings cap if configured.
  if (upperLimit > 0 && discount > upperLimit) {
    discount = upperLimit
  }

  const safeDiscount = Math.max(0, discount)
  if (safeDiscount <= 0) {
    return null
  }

  // For percentage promos, `save_text` should include the computed rupee savings
  // derived from the percentage (the UI needs the actual ₹ amount).
  // For fixed promos, it represents rupee savings.
  const output =
    method?.type === 'percentage' && pct != null && pct > 0 && pct <= 100
      ? `Save ₹${formatRupees(safeDiscount)}`
      : `Save ₹${formatRupees(safeDiscount)}`

  return output
}

/**
 * Display text for promotions/coupons.
 *
 * Keep `formatPromotionSavingsText` unchanged for backward compatibility,
 * and expose a separate name that callers can adopt for the "custom tagline
 * or default generated" text.
 */
export function formatPromotionDisplayText(promotion: PromotionInput): string | null {
  // Custom tagline (business-defined) overrides everything, max 50 chars enforced at write-time.
  const customTagline =
    ('promotion_extension' in promotion
      ? promotion.promotion_extension?.custom_tagline
      : (promotion as ProductPromotionResult).custom_tagline) ?? null

  const trimmed = typeof customTagline === "string" ? customTagline.trim() : ""
  if (trimmed) {
    return trimmed
  }

  // Default display text logic (no code mention), based on discount type + min cart + upper limit.
  // Case 1: Percentage: "Get <x>% off on orders above Rs <Y> up to Rs <Z>"
  // Case 2: Fixed amount: "Get <x> Rs off on orders above Rs <Y>"

  // Read min cart + upper limit from either format
  const minCart =
    'promotion_extension' in promotion
      ? Number(promotion.promotion_extension?.cart_sub_total) || 0
      : Number((promotion as ProductPromotionResult).min_cart_value) || 0

  const upperLimit =
    'promotion_extension' in promotion
      ? Number(promotion.promotion_extension?.promo_code_upper_limit) || 0
      : Number((promotion as ProductPromotionResult).promo_code_upper_limit) || 0

  const minCartText = minCart > 0 ? ` on orders above ₹${minCart}` : ""
  const upperLimitText = upperLimit > 0 ? ` up to ₹${upperLimit}` : ""

  // Promotion object format (listing)
  if ('application_method' in promotion && promotion.application_method) {
    const method = promotion.application_method

    if (method?.type === "percentage") {
      const raw = method.percentage_rate != null ? method.percentage_rate : method.value
      const pct = typeof raw === "string" ? parseFloat(raw) : Number(raw) || 0
      if (pct > 0 && pct <= 100) {
        return `Get ${pct}% off${minCartText}${upperLimitText}`
      }
      return null
    }

    if (method?.type === "fixed") {
      const raw = method.value
      const amt = typeof raw === "string" ? parseFloat(raw) : Number(raw) || 0
      if (amt > 0) {
        return `Get ₹${amt} off ${minCartText}`
      }
      return null
    }

    return null
  }

  // Product promotion result format (PLP/PDP computed)
  const productPromo = promotion as ProductPromotionResult
  const methodType = (productPromo.application_method_type || "").toLowerCase()

  if (methodType === "percentage") {
    const pct = Number(productPromo.application_method_value) || 0
    if (pct > 0 && pct <= 100) {
      return `Get ${pct}% off${minCartText}${upperLimitText}`
    }

    const derivedPct = Number(productPromo.discount_percentage) || 0
    if (derivedPct > 0 && derivedPct <= 100) {
      return `Get ${derivedPct}% off${minCartText}${upperLimitText}`
    }

    return null
  }

  if (methodType === "fixed") {
    const amt = Number(productPromo.application_method_value) || 0
    if (amt > 0) {
      return `Get ₹${amt} off ${minCartText}`
    }
    return null
  }

  // Unknown: only show custom tagline if present (handled above)
  return null
}


