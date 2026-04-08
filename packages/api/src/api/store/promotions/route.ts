import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Knex } from 'knex'

import {
  fetchCartData,
  checkCustomerFirstTimeStatus,
  filterPromotionsByFirstCustomer,
  filterPromotionsByDevice,
  filterValidPromotions,
  calculateRecommendations,
  formatPromotionSavingsText,
  formatPromotionDisplayText,
  filterPromotionsByCartEligibility,
  filterPromotionsByTier,
  filterPromotionsByPerCustomerUsage,
  buildSellerSaveTextDataByPromoCode,
  getPromotionSaveTextForResponse
} from "./helpers"
import type { PromotionWithExtension } from "./helpers"
import { getActivePromotionsEnriched } from "../../../shared/utils/promotion-cache"
import { getAgentType } from "../../../shared/utils/get-agent-type"
/**
 * @oas [get] /store/promotions
 * operationId: "StoreListPromotions"
 * summary: "List Promotions"
 * description: "Retrieves a list of promotions with intelligent recommendations based on cart value, customer type, and seller restrictions."
 * tags:
 *   - Store Promotions...
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex
  const customer_id = req.query.customer_id as string | undefined
  const cart_id = req.query.cart_id as string | undefined

  // Determine the agent type from the User-Agent header
  const agentType = getAgentType(req)

  // Get active promotions with extensions from cache or DB (single read-through)
  const activePromotions = await getActivePromotionsEnriched(req.scope)

  if (activePromotions.length === 0) {
    return res.json({
      promotions: [],
      recommended: [],
      count: 0,
      offset: 0,
      limit: 0
    })
  }

  // Promotions already enriched and hidden-filtered from cache
  let promotions = activePromotions

  // Filter out promotions with exhausted campaign budgets
  // Note: Campaign date filtering is already done by listActivePromotions_, only budget check remains
  promotions = filterValidPromotions(promotions)

  // Filter promotions based on customer tier (if customer_id is provided)
  if (customer_id) {
    promotions = await filterPromotionsByTier(promotions, customer_id, query)

    // Filter out promotions where customer has exceeded per-customer usage limit
    promotions = await filterPromotionsByPerCustomerUsage(promotions, customer_id, req.scope)
  }

  // Fetch cart data if cart_id is provided
  const cartData = await fetchCartData(cart_id, knex)

  // Check if customer is a first-time customer
  const customerIsFirstTime = await checkCustomerFirstTimeStatus(
    customer_id,
    query,
    req.scope
  )

  // Filter promotions based on first customer status
  promotions = filterPromotionsByFirstCustomer(promotions, customerIsFirstTime)

  // Filter promotions based on device type (app / web / all)
  promotions = filterPromotionsByDevice(promotions, agentType)

  // CRITICAL FIX: Filter promotions based on cart eligibility (product/seller restrictions)
  // This ensures product-specific coupons only show when those products are in cart
  promotions = await filterPromotionsByCartEligibility(
    promotions,
    cartData,
    cart_id,
    knex,
    req.scope
  )

  // Calculate recommendations using item_subtotal derived from cart (skip re-checking eligibility; already done above)
  const { recommended, otherPromotions } = await calculateRecommendations(
    promotions,
    cartData.itemSubtotal,
    customerIsFirstTime,
    cartData,
    cart_id,
    knex,
    req.scope,
    { skipEligibilityCheck: true }
  )

  // Intentionally do not override `recommended` based on already-applied coupons.
  // The recommendation engine should keep the same top recommendation even after the user applies it.

  // Prioritize recommended promotions in the main `promotions` list too.
  const recommendedIds = new Set((recommended as Array<{ id: string }>).map((p) => p.id))

  const appliedPromotionIds = Array.isArray(cartData.appliedPromotionIds)
    ? cartData.appliedPromotionIds
    : []
  const appliedPromotionSet = new Set(appliedPromotionIds)
  const appliedPromotionCount = appliedPromotionIds.length
  promotions.sort((a, b) => {
    const aRec = recommendedIds.has((a as { id: string }).id) ? 1 : 0
    const bRec = recommendedIds.has((b as { id: string }).id) ? 1 : 0
    return bRec - aRec
  })

  // Precompute seller-based `save_text` totals.
  const allPromoCandidatesForSellerSaveText = [
    ...(promotions as any[]),
    ...(recommended as any[]),
    ...(otherPromotions as any[])
  ]
  const sellerSaveTextDataByPromoCode = await buildSellerSaveTextDataByPromoCode(
    allPromoCandidatesForSellerSaveText,
    cartData,
    req.scope
  )

  // Helper function to remove target_rules and add savings_text
  const formatPromotionResponse = (promo: PromotionWithExtension) => {
    const { application_method, ...rest } = promo
    const applicationMethodWithoutTargetRules = application_method ? { ...application_method } : {}
    if (applicationMethodWithoutTargetRules.target_rules !== undefined) {
      delete applicationMethodWithoutTargetRules.target_rules
    }

    const saveText = getPromotionSaveTextForResponse(promo, {
      cartValue: cartData.itemSubtotal,
      appliedPromotionSet,
      appliedPromotionCount,
      sellerSaveTextDataByPromoCode,
      // `item_subtotal` is a pre-discount value (sum of unit_price * quantity),
      // so we must not back-calculate percentage savings from an assumed discounted cart.
      treatCartValueAsDiscountedWhenApplied: false
    })

    return {
      ...rest,
      application_method: applicationMethodWithoutTargetRules,
      savings_text: formatPromotionSavingsText(promo),
      save_text: saveText,
      display_text: formatPromotionDisplayText(promo)
    }
  }

  // Add savings_text to all promotions and remove target_rules
  const promotionsWithSavingsText = promotions.map(formatPromotionResponse)
  const recommendedFormatted = recommended.map(formatPromotionResponse)
  const otherPromotionsFormatted = otherPromotions.map(formatPromotionResponse)

  res.json({
    recommended: recommendedFormatted,
    other_promotions: otherPromotionsFormatted,
    promotions: promotionsWithSavingsText,
    count: promotions.length,
    offset: 0,
    limit: promotions.length
  })
}

