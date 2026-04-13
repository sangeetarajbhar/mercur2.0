import { Knex } from 'knex'

import { MedusaContainer } from '@medusajs/framework'

import promotionExtensionLink from '../../../links/promotion-custom'
import { isFirstCustomer } from '../../../shared/utils/check-first-customer'
import {
  formatPromotionDisplayText as formatPromotionDisplayTextShared,
  formatPromotionSaveText as formatPromotionSaveTextShared,
  formatPromotionSavingsText as formatPromotionSavingsTextShared
} from '../../../shared/utils/validate-promotion-restrictions'
import { getPromotionRulesWithCache, getPromotionExtensionFields } from '../../../shared/utils/promotion-cache'
import { checkPerCustomerCampaignUsage } from '../../../shared/utils/check-per-customer-usage'

export interface CartData {
  cartSellerIds: string[]
  cartProductIds: string[]
  itemSellerMap: Record<string, string>
  cartSellerTotals: Record<string, number>
  appliedPromotionIds: string[]
  cartItems: any[]
  itemSubtotal: number
}

export interface PromotionWithExtension {
  [key: string]: any
  promotion_extension?: {
    cart_sub_total?: number
    promo_code_upper_limit?: number
    first_customer?: boolean
    for_seller?: boolean
    seller_ids?: string[]
    is_hidden?: boolean
    applicable_on?: 'all' | 'app' | 'web'
    custom_tagline?: string | null
    terms_and_conditions?: string[]
  } | null
}

/**
 * Enrich promotions with their extension data.
 * If scope is provided and an extension is missing first_customer, it is filled from the promotion rules cache
 * so first-customer filtering is reliable when the graph response omits it.
 */
export async function enrichPromotionsWithExtensions(
  promotionsList: any[],
  query: any,
  scope?: MedusaContainer
): Promise<PromotionWithExtension[]> {
  const promotionIds = promotionsList.map((p: any) => p.id)

  if (promotionIds.length === 0) {
    return []
  }

  // Fetch promotion extensions
  const { data: promotionLinks } = await query.graph({
    entity: promotionExtensionLink.entryPoint,
    fields: getPromotionExtensionFields({ includeApplicableOn: true }),
    filters: {
      promotion_id: promotionIds
    }
  })

  // Create a map of promotion extensions by promotion_id
  // If multiple extensions exist for the same promotion, use the first one
  const extensionMap = new Map()
  
  promotionLinks.forEach((link: any) => {
    if (link.promotion_extension) {
      extensionMap.set(link.promotion_id, link.promotion_extension)
    }
  })

  // Transform the data to include promotion_extension
  let promotions = promotionsList.map((promo: any) => ({
    ...promo,
    promotion_extension: extensionMap.get(promo.id) || null
  }))

  // Fallback: when graph omits first_customer, fill from promotion rules cache so first-customer filter works
  if (scope) {
    for (const promo of promotions) {
      const ext = promo.promotion_extension
      if (ext != null && ext.first_customer === undefined && promo.code) {
        try {
          const rules = await getPromotionRulesWithCache(promo.code, scope)
          ext.first_customer = rules?.first_customer ?? false
        } catch {
          ext.first_customer = false
        }
      }
    }
  }

  // Filter out hidden promotions (is_hidden = true)
  // These coupons can still be applied directly if someone knows the code
  promotions = promotions.filter((promo: any) => {
    const extension = promo.promotion_extension
    return !extension?.is_hidden
  })

  return promotions
}

/**
 * Filter promotions based on the customer's device type (agent_type from JWT).
 * - Promotions with applicable_on = 'all' are shown to everyone.
 * - Promotions with applicable_on = 'app' are ONLY shown to app users.
 * - Promotions with applicable_on = 'web' are ONLY shown to web users.
 * If no extension or applicable_on is not set, it defaults to 'all' (visible everywhere).
 */
export function filterPromotionsByDevice(
  promotions: PromotionWithExtension[],
  agentType: 'app' | 'web'
): PromotionWithExtension[] {
  return promotions.filter((promo) => {
    const applicableOn = promo.promotion_extension?.applicable_on ?? 'all'
    if (applicableOn === 'all') return true
    return applicableOn === agentType
  })
}

/**
 * Check if a promotion is valid
 * Uses campaign start/end dates from the cached promotion object itself so that
 * even when the "active promotions" list is cached, expired campaigns stop
 * showing immediately in listings (cart, PLP, etc.).
 *
 * Budget exhaustion is still handled by Medusa core via CampaignBudgetExceededAction
 * during computeActions – here we only care about status + date window.
 */
export function isPromotionValid(promotion: PromotionWithExtension): boolean {
  if (!promotion) {
    return false
  }

  // If status is present, only allow active promotions
  if (promotion.status && promotion.status !== "active") {
    return false
  }

  const campaign = (promotion as any).campaign
  if (!campaign) {
    // No campaign attached – treat as always valid here
    return true
  }

  const now = new Date()

  if (campaign.starts_at) {
    const startsAt = new Date(campaign.starts_at)
    if (startsAt.getTime() > now.getTime()) {
      return false
    }
  }

  if (campaign.ends_at) {
    const endsAt = new Date(campaign.ends_at)
    if (endsAt.getTime() < now.getTime()) {
      return false
    }
  }

  return true
}

/**
 * Filter promotions to only include valid ones (active status + valid campaign)
 */
export function filterValidPromotions(
  promotions: PromotionWithExtension[]
): PromotionWithExtension[] {
  return promotions.filter(isPromotionValid)
}

/**
 * Fetch cart data including items, sellers, and applied promotions
 */
export async function fetchCartData(
  cartId: string | undefined,
  knex: Knex
): Promise<CartData> {
  const cartData: CartData = {
    cartSellerIds: [],
    cartProductIds: [],
    itemSellerMap: {},
    cartSellerTotals: {},
    appliedPromotionIds: [],
    cartItems: [],
    itemSubtotal: 0
  }

  if (!cartId) {
    return cartData
  }

  try {
    // Get all cart items
    const cartItems = await knex("cart_line_item")
      .select(["id", "variant_id", "product_id", "unit_price", "quantity"])
      .where({ cart_id: cartId })
      .whereNull("deleted_at")

    if (cartItems && cartItems.length > 0) {
      const lineItemIds = cartItems.map(item => item.id)

      // Collect unique product IDs in cart
      cartData.cartProductIds = [...new Set(cartItems.map(item => item.product_id))]

      // Get seller mappings for cart items
      const sellerMappings = await knex("seller_seller_cart_line_item")
        .select(["line_item_id", "seller_id"])
        .whereIn("line_item_id", lineItemIds)
        .whereNull("deleted_at")

      // Build item-seller relationship map
      sellerMappings.forEach((mapping: any) => {
        cartData.itemSellerMap[mapping.line_item_id] = mapping.seller_id
        if (!cartData.cartSellerIds.includes(mapping.seller_id)) {
          cartData.cartSellerIds.push(mapping.seller_id)
        }
      })

      cartData.cartItems = cartItems

      // Compute item subtotal (sum of unit_price * quantity across all items)
      cartData.itemSubtotal = cartItems.reduce((sum: number, item: any) => {
        return sum + (Number(item?.unit_price) || 0) * (Number(item?.quantity) || 0)
      }, 0)

      // Compute seller subtotals based on line item unit_price * quantity
      // so seller-based coupons can show "save_text" derived from seller total.
      cartData.cartSellerTotals =
        cartData.cartSellerIds.length > 0
          ? cartItems.reduce<Record<string, number>>((acc, item: any) => {
              const sellerId = cartData.itemSellerMap?.[item?.id]
              if (!sellerId) return acc
              const unitPrice = Number(item?.unit_price) || 0
              const qty = Number(item?.quantity) || 0
              const lineTotal = unitPrice * qty
              acc[sellerId] = (acc[sellerId] || 0) + lineTotal
              return acc
            }, {})
          : {}
    }

    // Get already applied promotions to this cart
    const appliedPromotions = await knex("cart_promotion")
      .select(["promotion_id"])
      .where({ cart_id: cartId })
      .whereNull("deleted_at")

    cartData.appliedPromotionIds = appliedPromotions.map((cp: any) => cp.promotion_id)
  } catch (error) {
    console.error("Error fetching cart information:", error)
  }

  return cartData
}

/**
 * Check if promotion is eligible for cart
 * Uses CustomPromotionModuleService.computeActions to check eligibility
 * This ensures the same filtering logic is used as in the workflow
 * 
 * Returns boolean indicating if promotion can be applied to cart
 */
export async function checkPromotionEligibilityForCart(
  promoCode: string,
  cartId: string | undefined,
  cartItems: any[],
  itemSellerMap: Record<string, string>,
  knex: Knex,
  scope: MedusaContainer
): Promise<boolean> {
  try {
    // Get promotion rules from cache
    const promotionRules = await getPromotionRulesWithCache(promoCode, scope)
    
    if (!promotionRules) {
      // Promotion not found or inactive
      return false
    }

    const hasProductRestrictions = promotionRules.product_rule_ids && promotionRules.product_rule_ids.length > 0
    // for_seller=false means "seller-specific" (restrict to seller_ids); for_seller=true means global (no restriction).
    const hasSellerRestrictions = promotionRules.for_seller !== true && 
                                   promotionRules.seller_ids && 
                                   promotionRules.seller_ids.length > 0

    // If no cart_id provided or cart is empty
    if (!cartId || cartItems.length === 0) {
      // Don't show promotions with product restrictions without cart context
      if (hasProductRestrictions) {
        return false
      }
      
      // Don't show promotions with seller restrictions without cart context
      if (hasSellerRestrictions) {
        return false
      }
      
      // Show promotions without product/seller restrictions
      return true
    }

    // If cart has items, check if the specific products/sellers in cart match restrictions
    if (hasProductRestrictions) {
      // Check if any cart products match the restricted products
      const cartProductIds = cartItems.map(item => item.product_id).filter(Boolean)
      const hasMatchingProduct = cartProductIds.some(productId => 
        promotionRules.product_rule_ids.includes(productId)
      )
      
      if (!hasMatchingProduct) {
        // Cart doesn't contain any of the restricted products - don't show this promotion
        return false
      }
    }

    if (hasSellerRestrictions) {
      // Seller-restricted coupons should apply when the cart contains
      // at least one product from an allowed seller.
      const cartSellerIds = Object.values(itemSellerMap).filter(Boolean)
      
      // If cart has no seller mappings, we can't verify seller restrictions
      // So we should not show seller-restricted promotions
      if (cartSellerIds.length === 0) {
        return false
      }
      
      const allowedSellerIds = promotionRules.seller_ids || []

      const hasAtLeastOneAllowedSeller = cartSellerIds.some(sellerId =>
        allowedSellerIds.includes(sellerId)
      )

      if (!hasAtLeastOneAllowedSeller) {
        return false
      }
    }

    // If we got here, either:
    // 1. Promotion has no restrictions (show it)
    // 2. Promotion has restrictions AND cart matches them (show it)
    return true
  } catch (error) {
    console.error(`Error checking cart eligibility for ${promoCode}:`, error)
    // On error, be conservative - don't show the promotion
    return false
  }
}

/**
 * Check if customer is a first-time customer
 * Returns null if customer_id is not provided (unknown status)
 */
export async function checkCustomerFirstTimeStatus(
  customerId: string | undefined,
  query: any,
  scope: MedusaContainer
): Promise<boolean | null> {
  if (!customerId) {
    return null // null means unknown
  }

  try {
    const {
      data: [customer]
    } = await query.graph({
      entity: 'customer',
      fields: ['id', 'has_account'],
      filters: {
        id: customerId
      }
    })

    // Check if customer is a first-time customer using shared utility
    const isFirstTimeCustomer = await isFirstCustomer(customerId, scope)

    // Customer is first-time if they have an account and no valid orders
    if (customer && customer.has_account && isFirstTimeCustomer) {
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error('Error checking customer status:', error)
    // On error, default to non-first customer if customer_id was provided
    return false
  }
}

/**
 * Filter promotions based on first customer status
 */
export function filterPromotionsByFirstCustomer(
  promotions: PromotionWithExtension[],
  customerIsFirstTime: boolean | null
): PromotionWithExtension[] {
  // Only filter if we know the customer is NOT a first-time customer
  // If customer status is unknown (null), show all promotions
  if (customerIsFirstTime === false) {
    // For non-first customers, filter out first_customer promotions
    return promotions.filter((promo) => {
      const extension = promo.promotion_extension
      return !extension?.first_customer
    })
  }

  return promotions
}

/**
 * Filter promotions based on customer tier
 * - Shows promotions NOT associated with any tier (global promotions)
 * - Shows promotions associated with the customer's tier
 * - Hides promotions from other tiers
 */
export async function filterPromotionsByTier(
  promotions: PromotionWithExtension[],
  customerId: string,
  query: any
): Promise<PromotionWithExtension[]> {
  // Get customer's tier
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "tier.id"],
    filters: { id: customerId },
  })

  const customerTier = customers?.[0]?.tier

  // If customer has no tier, only show promotions not associated with any tier
  if (!customerTier?.id) {
    // Get all tiers that have these promotions
    const promotionIds = promotions.map((p) => p.id).filter(Boolean)
    
    if (promotionIds.length === 0) {
      return promotions
    }

    const { data: tierPromotions } = await query.graph({
      entity: "tier",
      fields: ["id", "promo_id"],
      filters: { promo_id: promotionIds },
    })

    // Filter: only keep promotions that are NOT in any tier
    const noTierResult = promotions.filter((promo) => {
      const tierPromo = tierPromotions.find((tp: any) => tp.promo_id === promo.id)
      return !tierPromo // Only show if not associated with any tier
    })
    return noTierResult
  }

  // Customer has a tier - get all tiers that have these promotions
  const promotionIds = promotions.map((p) => p.id).filter(Boolean)
  
  if (promotionIds.length === 0) {
    return promotions
  }

  const { data: tierPromotions } = await query.graph({
    entity: "tier",
    fields: ["id", "promo_id"],
    filters: { promo_id: promotionIds },
  })

  // Filter: keep promotions that are either:
  // 1. Not associated with any tier (global promotions)
  // 2. Associated with the customer's tier
  const result = promotions.filter((promo) => {
    const tierPromo = tierPromotions.find((tp: any) => tp.promo_id === promo.id)
    
    // If promotion is not in any tier, show it (global promotion)
    if (!tierPromo) {
      return true
    }
    
    // If promotion is in a tier, only show if it's the customer's tier
    return tierPromo.id === customerTier.id
  })
  return result
}


export async function filterGuestPromotionsByTier(
  promotions: PromotionWithExtension[],
  query: any
): Promise<PromotionWithExtension[]> {

  // Customer has a tier - get all tiers that have these promotions
  const promotionIds = promotions.map((p) => p.id).filter(Boolean)
  
  if (promotionIds.length === 0) {
    return promotions
  }

  const { data: tierPromotions } = await query.graph({
    entity: "tier",
    fields: ["id", "promo_id"],
    filters: { promo_id: promotionIds },
  })

  // Filter: keep promotions that are either:
  // 1. Not associated with any tier (global promotions)
  // 2. Associated with the customer's tier
  const result = promotions.filter((promo) => {
    const tierPromo = tierPromotions.find((tp: any) => tp.promo_id === promo.id)
    
    // If promotion is not in any tier, show it (global promotion)
    if (!tierPromo) {
      return true
    }
    
    // If promotion is in a tier, only show if it's the customer's tier
    return false
  })
  return result
}

/**
 * Filter promotions based on cart eligibility (product/seller restrictions)
 * This ensures product-specific coupons only show when those products are in cart
 */
export async function filterPromotionsByCartEligibility(
  promotions: PromotionWithExtension[],
  cartData: CartData,
  cartId: string | undefined,
  knex: Knex,
  scope: MedusaContainer
): Promise<PromotionWithExtension[]> {
  const filteredPromotions: PromotionWithExtension[] = []

  for (const promo of promotions) {
    // Check if this promotion is eligible for the current cart
    const isEligible = await checkPromotionEligibilityForCart(
      promo.code,
      cartId,
      cartData.cartItems,
      cartData.itemSellerMap,
      knex,
      scope
    )

    if (isEligible) {
      filteredPromotions.push(promo)
    }
  }

  return filteredPromotions
}

/**
 * Filter out promotions where customer has exceeded their per-customer usage limit.
 * Only applies to promotions with USE_BY_ATTRIBUTE budget type (usage_per / spend_per).
 * Calls the standalone checkPerCustomerCampaignUsage utility to avoid code duplication.
 */
export async function filterPromotionsByPerCustomerUsage(
  promotions: PromotionWithExtension[],
  customerId: string,
  scope: MedusaContainer
): Promise<PromotionWithExtension[]> {
  if (!customerId || promotions.length === 0) {
    return promotions
  }

  try {
    const filteredPromotions: PromotionWithExtension[] = []

    for (const promo of promotions) {
      try {
        // Call the standalone utility directly — no Proxy needed
        const usageError = await checkPerCustomerCampaignUsage(promo.code, customerId, scope)

        // Only include if no error (customer hasn't exceeded limit)
        if (!usageError) {
          filteredPromotions.push(promo)
        } else {
          // Customer has exceeded limit - filter it out
          console.log(`Filtering out promotion ${promo.code}: ${usageError.message}`)
        }
      } catch (promoError) {
        // If error checking this specific promotion, include it (fail open for this promo)
        console.error(`Error checking per-customer usage for promotion ${promo.code}:`, promoError)
        filteredPromotions.push(promo)
      }
    }

    return filteredPromotions
  } catch (error) {
    console.error('Error filtering promotions by per-customer usage:', error)
    // On error, return all promotions (fail open)
    return promotions
  }
}

/**
 * Calculate discount value for a promotion based on cart value
 */
export function calculateDiscountValue(promotion: any, cartValue: number): number {
  if (!promotion.application_method) {
    return 0
  }

  const method = promotion.application_method

  if (method.type === 'percentage') {
    return (cartValue * (method.value || 0)) / 100
  } else if (method.type === 'fixed') {
    return method.value || 0
  }

  return 0
}

/**
 * Format promotion savings text with upper limit
 * Re-exports the shared utility function for backward compatibility
 */
export function formatPromotionSavingsText(promotion: PromotionWithExtension): string | null {
  return formatPromotionSavingsTextShared(promotion)
}

/**
 * Display text for promotions/coupons (custom tagline or default generated text).
 * Kept separate so APIs can add it without changing existing `savings_text` consumers.
 */
export function formatPromotionDisplayText(promotion: PromotionWithExtension): string | null {
  return formatPromotionDisplayTextShared(promotion)
}

/**
 * Rupee savings text computed from `cart_value` (percentage and fixed).
 * Kept in this module so the promotions route can enrich response consistently.
 */
export function formatPromotionSaveText(
  promotion: PromotionWithExtension,
  cartValue: number,
  options?: {
    isApplied?: boolean
    appliedPromotionCount?: number
  }
): string | null {
  return formatPromotionSaveTextShared(promotion, cartValue, options)
}

export type SellerSaveTextData = {
  sellerTotal: number
  isSellerSpecific: boolean
}

/**
 * Build a map of promo_code -> seller-specific subtotal used for `save_text`.
 *
 * Important: At `/store/promotions`, `promotion_extension.seller_ids` is often empty.
 * We therefore use the same `getPromotionRulesWithCache` source used by cart eligibility.
 */
export async function buildSellerSaveTextDataByPromoCode(
  promotionCandidates: Array<{
    code?: string | null
  }>,
  cartData: CartData,
  scope: MedusaContainer
): Promise<Map<string, SellerSaveTextData>> {
  const sellerSaveTextDataByPromoCode = new Map<string, SellerSaveTextData>()

  const uniquePromoCodes = Array.from(
    new Set(
      promotionCandidates
        .map((p) => (typeof p?.code === 'string' ? p.code.trim() : ''))
        .filter((c) => Boolean(c))
    )
  )

  // Limit concurrency to avoid a stampede of cache reads on large carts.
  const CONCURRENCY = 20
  for (let i = 0; i < uniquePromoCodes.length; i += CONCURRENCY) {
    const chunk = uniquePromoCodes.slice(i, i + CONCURRENCY)

    await Promise.all(
      chunk.map(async (promoCode) => {
        try {
          const rules = await getPromotionRulesWithCache(promoCode, scope)
          const sellerIds = rules?.seller_ids ?? []
          const isSellerSpecific = Boolean(rules && rules.for_seller !== true && sellerIds.length > 0)

          const sellerTotal = isSellerSpecific
            ? sellerIds.reduce(
                (sum, sellerId) => sum + (Number(cartData.cartSellerTotals[sellerId]) || 0),
                0
              )
            : 0

          sellerSaveTextDataByPromoCode.set(promoCode, { sellerTotal, isSellerSpecific })
        } catch {
          sellerSaveTextDataByPromoCode.set(promoCode, { sellerTotal: 0, isSellerSpecific: false })
        }
      })
    )
  }

  return sellerSaveTextDataByPromoCode
}

/**
 * Compute `save_text` base amount for a promo.
 *
 * Seller-specific coupons should use seller subtotal (seller_total) both before and after
 * applying the coupon. We pass `isApplied: false` for seller-specific coupons to prevent
 * back-calculating from the globally discounted `cart_value`.
 */
export function getPromotionSaveTextForResponse(
  promo: PromotionWithExtension,
  args: {
    cartValue: number
    appliedPromotionSet: Set<string>
    appliedPromotionCount: number
    sellerSaveTextDataByPromoCode: Map<string, SellerSaveTextData>
    treatCartValueAsDiscountedWhenApplied?: boolean
  }
): string | null {
  const {
    cartValue,
    appliedPromotionSet,
    appliedPromotionCount,
    sellerSaveTextDataByPromoCode,
    treatCartValueAsDiscountedWhenApplied = true
  } = args

  const isApplied = promo?.id != null && appliedPromotionSet.has(promo.id)
  const promoCode = typeof promo?.code === 'string' ? promo.code.trim() : ''
  const ruleData = promoCode ? sellerSaveTextDataByPromoCode.get(promoCode) : undefined

  const isSellerBasedCoupon = ruleData?.isSellerSpecific === true
  const sellerTotal = ruleData?.sellerTotal ?? 0

  const saveTextBaseValue = isSellerBasedCoupon && sellerTotal > 0 ? sellerTotal : cartValue
  // In some listing contexts `cartValue` is provided as a pre-discount subtotal even when a promo is applied.
  // If we treated it as discounted, percentage promos would back-calculate and inflate savings.
  const saveTextIsApplied =
    isSellerBasedCoupon || treatCartValueAsDiscountedWhenApplied === false ? false : isApplied

  const computed = formatPromotionSaveText(promo, saveTextBaseValue, {
    isApplied: saveTextIsApplied,
    appliedPromotionCount
  })

  return computed
}

/**
 * Check if promotion meets cart value requirements
 */
export function meetsCartValueRequirements(
  extension: any,
  cartValue: number,
  ignoreUpperLimit: boolean = false
): boolean {
  if (!extension) {
    return true // No extension means no restriction
  }

  const minValue = extension.cart_sub_total || 0
  const maxValue = extension.promo_code_upper_limit || Infinity

  // ignore upper limit
  ignoreUpperLimit = true
  if (ignoreUpperLimit) {
    return cartValue >= minValue
  }

  return cartValue >= minValue && cartValue <= maxValue
}

/**
 * Calculate recommendations based on cart value and customer status
 * @param options.skipEligibilityCheck - When true, assume promotions were already filtered by cart eligibility (e.g. by filterPromotionsByCartEligibility)
 */
export async function calculateRecommendations(
  promotions: PromotionWithExtension[],
  cartValue: number,
  customerIsFirstTime: boolean | null,
  cartData: CartData,
  cartId: string | undefined,
  knex: Knex,
  scope: MedusaContainer,
  options?: { skipEligibilityCheck?: boolean }
): Promise<{ recommended: any[]; otherPromotions: any[] }> {
  const result = {
    recommended: [] as any[],
    otherPromotions: [] as any[]
  }

  if (cartValue <= 0) {
    return result
  }

  const skipEligibility = options?.skipEligibilityCheck === true

  if (customerIsFirstTime === true) {
    return await calculateRecommendationsForFirstCustomer(
      promotions,
      cartValue,
      cartData,
      cartId,
      knex,
      scope,
      skipEligibility
    )
  } else if (customerIsFirstTime === null) {
    return await calculateRecommendationsForUnknownCustomer(
      promotions,
      cartValue,
      cartData,
      cartId,
      knex,
      scope,
      skipEligibility
    )
  } else {
    return await calculateRecommendationsForNonFirstCustomer(
      promotions,
      cartValue,
      cartData,
      cartId,
      knex,
      scope,
      skipEligibility
    )
  }
}

/**
 * Filter and categorize promotions based on eligibility and cart value requirements
 * Returns categorized promotions: firstCustomerPromos and eligiblePromos
 * When skipEligibilityCheck is true, cart eligibility was already enforced by the caller (e.g. filterPromotionsByCartEligibility).
 */
async function filterAndCategorizePromotions(
  promotions: PromotionWithExtension[],
  cartValue: number,
  cartData: CartData,
  cartId: string | undefined,
  knex: Knex,
  scope: MedusaContainer,
  options: {
    skipFirstCustomer?: boolean
    skipEligibilityCheck?: boolean
  } = {}
): Promise<{ firstCustomerPromos: any[]; eligiblePromos: any[] }> {
  const firstCustomerPromos: any[] = []
  const eligiblePromos: any[] = []

  for (const promo of promotions) {
    const extension = promo.promotion_extension

    // Skip first customer promotions if requested
    if (options.skipFirstCustomer && extension?.first_customer) {
      continue
    }

    // Check if promotion is eligible for cart (seller + product restrictions); skip if caller already did this
    if (!options.skipEligibilityCheck) {
      const isEligible = await checkPromotionEligibilityForCart(
        promo.code,
        cartId,
        cartData.cartItems,
        cartData.itemSellerMap,
        knex,
        scope
      )

      if (!isEligible) {
        continue
      }
    }

    // Check cart value eligibility
    const meetsRequirements = meetsCartValueRequirements(extension, cartValue)
    const hasNoExtension = !extension

    if (extension?.first_customer) {
      if (meetsRequirements) {
        firstCustomerPromos.push(promo)
      }
    } else {
      if (meetsRequirements || hasNoExtension) {
        eligiblePromos.push(promo)
      }
    }
  }

  return { firstCustomerPromos, eligiblePromos }
}

/**
 * Calculate recommendations for first-time customers
 */
async function calculateRecommendationsForFirstCustomer(
  promotions: PromotionWithExtension[],
  cartValue: number,
  cartData: CartData,
  cartId: string | undefined,
  knex: Knex,
  scope: MedusaContainer,
  skipEligibilityCheck: boolean
): Promise<{ recommended: any[]; otherPromotions: any[] }> {
  const { firstCustomerPromos, eligiblePromos } = await filterAndCategorizePromotions(
    promotions,
    cartValue,
    cartData,
    cartId,
    knex,
    scope,
    { skipFirstCustomer: false, skipEligibilityCheck }
  )

  if (firstCustomerPromos.length > 0) {
    const sorted = sortPromotionsByDiscountValue(firstCustomerPromos, cartValue)
    return {
      recommended: removeDiscountValueField([sorted[0]]),
      otherPromotions: [...removeDiscountValueField(sorted.slice(1)), ...eligiblePromos]
    }
  } else if (eligiblePromos.length > 0) {
    const sorted = sortPromotionsByDiscountValue(eligiblePromos, cartValue)
    return {
      recommended: removeDiscountValueField([sorted[0]]),
      otherPromotions: removeDiscountValueField(sorted.slice(1))
    }
  }

  return { recommended: [], otherPromotions: [] }
}

/**
 * Calculate recommendations when customer status is unknown
 */
async function calculateRecommendationsForUnknownCustomer(
  promotions: PromotionWithExtension[],
  cartValue: number,
  cartData: CartData,
  cartId: string | undefined,
  knex: Knex,
  scope: MedusaContainer,
  skipEligibilityCheck: boolean
): Promise<{ recommended: any[]; otherPromotions: any[] }> {
  const { firstCustomerPromos, eligiblePromos } = await filterAndCategorizePromotions(
    promotions,
    cartValue,
    cartData,
    cartId,
    knex,
    scope,
    { skipFirstCustomer: false, skipEligibilityCheck }
  )

  if (firstCustomerPromos.length > 0) {
    const sorted = sortPromotionsByDiscountValue(firstCustomerPromos, cartValue)
    return {
      recommended: removeDiscountValueField([sorted[0]]),
      otherPromotions: [...removeDiscountValueField(sorted.slice(1)), ...eligiblePromos]
    }
  } else if (eligiblePromos.length > 0) {
    const sorted = sortPromotionsByDiscountValue(eligiblePromos, cartValue)
    return {
      recommended: removeDiscountValueField([sorted[0]]),
      otherPromotions: removeDiscountValueField(sorted.slice(1))
    }
  } else {
    // Find the best available promotion (meets minimum requirement, ignore upper limit)
    // Filter out first_customer promotions in fallback for consistency
    return await findBestAvailablePromotion(
      promotions.filter(p => !p.promotion_extension?.first_customer),
      cartValue,
      cartData,
      cartId,
      knex,
      scope,
      skipEligibilityCheck
    )
  }
}

/**
 * Calculate recommendations for non-first customers
 */
async function calculateRecommendationsForNonFirstCustomer(
  promotions: PromotionWithExtension[],
  cartValue: number,
  cartData: CartData,
  cartId: string | undefined,
  knex: Knex,
  scope: MedusaContainer,
  skipEligibilityCheck: boolean
): Promise<{ recommended: any[]; otherPromotions: any[] }> {
  const { eligiblePromos } = await filterAndCategorizePromotions(
    promotions,
    cartValue,
    cartData,
    cartId,
    knex,
    scope,
    { skipFirstCustomer: true, skipEligibilityCheck }
  )

  if (eligiblePromos.length > 0) {
    const sorted = sortPromotionsByDiscountValue(eligiblePromos, cartValue)
    return {
      recommended: removeDiscountValueField([sorted[0]]),
      otherPromotions: removeDiscountValueField(sorted.slice(1))
    }
  } else {
    // Find the best available promotion (meets minimum requirement, ignore upper limit)
    return await findBestAvailablePromotion(
      promotions.filter(p => !p.promotion_extension?.first_customer),
      cartValue,
      cartData,
      cartId,
      knex,
      scope,
      skipEligibilityCheck
    )
  }
}

/**
 * Find the best available promotion (meets minimum requirement, ignore upper limit)
 * When skipEligibilityCheck is true, cart eligibility was already enforced by the caller.
 */
async function findBestAvailablePromotion(
  promotions: PromotionWithExtension[],
  cartValue: number,
  cartData: CartData,
  cartId: string | undefined,
  knex: Knex,
  scope: MedusaContainer,
  skipEligibilityCheck: boolean = false
): Promise<{ recommended: any[]; otherPromotions: any[] }> {
  const availablePromotions: any[] = []

  for (const promo of promotions) {
    const extension = promo.promotion_extension

    // Check seller eligibility unless caller already did this
    if (!skipEligibilityCheck) {
      const isEligible = await checkPromotionEligibilityForCart(
        promo.code,
        cartId,
        cartData.cartItems,
        cartData.itemSellerMap,
        knex,
        scope
      )

      if (!isEligible) {
        continue
      }
    }

    // Include promotions that meet minimum cart requirement (ignore upper limit)
    if (meetsCartValueRequirements(extension, cartValue, true)) {
      availablePromotions.push(promo)
      continue
    }

    // Include promotions with no cart restrictions
    if (!extension || extension.cart_sub_total === 0 || extension.cart_sub_total === null) {
      availablePromotions.push(promo)
    }
  }

  if (availablePromotions.length > 0) {
    const sorted = sortPromotionsByDiscountValue(availablePromotions, cartValue)
    return {
      recommended: removeDiscountValueField([sorted[0]]),
      otherPromotions: removeDiscountValueField(sorted.slice(1))
    }
  }

  return { recommended: [], otherPromotions: [] }
}

/**
 * Sort promotions by discount value (highest first)
 */
function sortPromotionsByDiscountValue(
  promotions: any[],
  cartValue: number
): any[] {
  const withDiscountValue = promotions.map((promo) => ({
    ...promo,
    calculated_discount_value: calculateDiscountValue(promo, cartValue)
  }))

  return withDiscountValue.sort(
    (a: any, b: any) => b.calculated_discount_value - a.calculated_discount_value
  )
}

/**
 * Remove calculated_discount_value field from promotions and add savings_text
 */
function removeDiscountValueField(promotions: any[]): any[] {
  return promotions.map((promo: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { calculated_discount_value, ...rest } = promo
    return {
      ...rest,
      savings_text: formatPromotionSavingsText(promo),
      display_text: formatPromotionDisplayText(promo)
    }
  })
}

