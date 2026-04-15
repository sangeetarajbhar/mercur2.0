/**
 * Separates manual and automatic promotions and returns the appropriate promotion codes
 * 
 * Rules:
 * - If manual promotions exist → return only manual promotions (ignore automatic)
 * - If no manual promotions → merge existing automatic + newly discovered automatic
 * - If input promo_codes provided → use those (user explicitly provided)
 * 
 * @param existingPromotions - Array of existing promotions with is_automatic property
 * @param newlyDiscoveredAutoCodes - Array of newly discovered automatic promotion codes
 * @param inputPromoCodes - Optional array of promo codes explicitly provided by user
 * @returns Array of promotion codes to apply
 */
export function separateManualAutomaticPromotions(
  existingPromotions: Array<{ code?: string | null; is_automatic?: boolean }>,
  newlyDiscoveredAutoCodes: string[] = [],
  inputPromoCodes?: string[]
): string[] {
  // If user explicitly provided promo codes, use those
  if (inputPromoCodes && inputPromoCodes.length > 0) {
    return inputPromoCodes
  }

  // Separate existing promotions into manual and automatic
  const manualPromoCodes = existingPromotions
    .filter((p) => !p.is_automatic)
    .map((p) => p?.code)
    .filter(Boolean) as string[]

  const existingAutoCodes = existingPromotions
    .filter((p) => p.is_automatic)
    .map((p) => p?.code)
    .filter(Boolean) as string[]

  // If manual promotions exist, ONLY return manual promotions (ignore automatic ones)
  if (manualPromoCodes.length > 0) {
    return manualPromoCodes
  }

  // No manual promotions - merge existing automatic with newly discovered automatic
  const allAutoCodes = [...new Set([...existingAutoCodes, ...newlyDiscoveredAutoCodes])]

  return allAutoCodes
}

/**
 * Filters promotion codes to remove automatic promotions when manual promotions exist
 * This is a defensive check used in get-actions-to-compute-from-promotions.ts
 * 
 * @param promotionCodes - Array of promotion codes to filter
 * @param promotionDetails - Array of promotion details with code and is_automatic
 * @returns Filtered array of promotion codes (automatic removed if manual exists)
 */
export function filterAutomaticWhenManualExists(
  promotionCodes: string[],
  promotionDetails: Array<{ code?: string | null; is_automatic?: boolean }>
): string[] {
  const manualPromotions = promotionDetails.filter((p) => !p.is_automatic)
  const autoPromotions = promotionDetails.filter((p) => p.is_automatic)

  // If manual promotions exist, remove automatic promotions
  if (manualPromotions.length > 0 && autoPromotions.length > 0) {
    return promotionCodes.filter(
      (code) => !autoPromotions.some((p) => p.code === code)
    )
  }

  return promotionCodes
}

