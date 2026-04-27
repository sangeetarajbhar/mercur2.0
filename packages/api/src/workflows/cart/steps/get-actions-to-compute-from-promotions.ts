import { CartDTO, IPromotionModuleService } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import CustomPromotionModuleService from "../../../modules/promotion-custom/service"
import { getPromotionRulesWithCache } from "../../../shared/utils/promotion-cache"
import { roundToTwoDecimals } from "../../../shared/utils/calculate-discount-amount"

/**
 * The details of the cart and its applied promotions.
 */
export interface GetActionsToComputeFromPromotionsStepInput {
  /**
   * The cart to compute the actions for.
   */
  cart: CartDTO
  /**
   * The promotion codes applied on the cart.
   */
  promotionCodesToApply: string[]
  /**
   * The action being performed (ADD, REMOVE, REPLACE).
   */
  action?: string
}

export const getActionsToComputeFromPromotionsStepId =
  "get-actions-to-compute-from-promotions"

/**
 * Helper to parse BigNumber values (Medusa uses BigNumber for amounts)
 */
function parseBigNumberValue(value: unknown): number {
  if (typeof value === 'string') {
    return Number(value) || 0
  }
  if (typeof value === 'number') {
    return value
  }
  // Handle BigNumber objects (Medusa uses BigNumber for amounts)
  if (value && typeof value === 'object' && 'numeric' in value) {
    const numeric = (value as { numeric?: number }).numeric
    return typeof numeric === 'number' ? numeric : 0
  }
  // Handle objects with value property (BigNumber raw format)
  if (value && typeof value === 'object' && 'value' in value) {
    const val = (value as { value?: unknown }).value
    if (typeof val === 'string') {
      return Number(val) || 0
    }
    if (typeof val === 'number') {
      return val
    }
  }
  return 0
}

/**
 * This step retrieves the actions to compute based on the promotions
 * applied on a cart.
 *
 * :::tip
 *
 * You can use the {@link retrieveCartStep} to retrieve a cart's details.
 *
 * :::
 *
 * @example
 * const data = getActionsToComputeFromPromotionsStep({
 *   // retrieve the details of the cart from another workflow
 *   // or in another step using the Cart Module's service
 *   cart,
 *   promotionCodesToApply: ["10OFF"]
 * })
 */
export const getActionsToComputeFromPromotionsStep = createStep(
  getActionsToComputeFromPromotionsStepId,
  async (data: GetActionsToComputeFromPromotionsStepInput, { container }): Promise<StepResponse<any>> => {
    const { cart, promotionCodesToApply = [], action } = data

    // Handle REMOVE action - return empty actions to remove specific promotions
    // For REMOVE, promotionCodesToApply contains codes that should STAY (existing minus removed)
    // These already have adjustments, so no need to recompute - just return empty actions
    if (action === "remove" || action === "REMOVE") {
      return new StepResponse({
        actions: [],
        validatedPromotionCodes: promotionCodesToApply
      })
    }

    // Get base promotion service and wrap it with custom service
    const baseService = container.resolve<IPromotionModuleService>(
      Modules.PROMOTION
    )
    // Use custom service wrapper - Proxy delegates all methods except computeActions to baseService
    // Pass container so eligibility checks can access services
    const promotionService = (new CustomPromotionModuleService(baseService, container) as any) as IPromotionModuleService

    // Get existing promotion codes directly from cart.promotions
    const uniqueExistingCodes = ((cart as any).promotions?.map((p: any) => p.code).filter(Boolean) || []) as string[]

    // Get rejected codes from cart metadata to filter them out
    let rejectedCodes: string[] = []
    if ((cart as any).metadata) {
      let metadata = (cart as any).metadata
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata)
        } catch {
          metadata = {}
        }
      }
      rejectedCodes = metadata.rejected_auto_promo_codes || []
    }

    // Clear adjustments so computeActions works with a clean cart
    cart.items?.forEach(item => {
      item.adjustments = []
    })

    const filteredPromotionCodesToApply = promotionCodesToApply
    // Filter out rejected codes from existing codes
    const filteredUniqueExistingCodes = uniqueExistingCodes.filter(
      (code: string) => !rejectedCodes.includes(code)
    )
    
    // Determine which codes to compute actions for
    // ADD: Include existing + new codes (Medusa handles stacking validation)
    // REPLACE: Only new codes (Medusa removes existing ones via workflow)
    let codesToCompute: string[]
    if (action === "add" || action === "ADD") {
      // ADD: Combine existing and new codes - Medusa handles stacking
      codesToCompute = [...new Set([...filteredUniqueExistingCodes, ...filteredPromotionCodesToApply])]
    } else {
      // REPLACE: Only new codes - Medusa workflow removes existing ones
      codesToCompute = filteredPromotionCodesToApply
    }
    
    // If no codes to compute, return empty
    if (codesToCompute.length === 0) {
      return new StepResponse({
        actions: [],
        validatedPromotionCodes: codesToCompute
      })
    }

    // Ensure cart has currency_code (required for computeActions)
    if (!cart.currency_code) {
      cart.currency_code = "inr"
    }
    
    const normalizedCurrencyCode = cart.currency_code.toLowerCase()
    
    // Build promo details from rules cache (no listActivePromotions DB call)
    const rulesByCode = new Map<string, Awaited<ReturnType<typeof getPromotionRulesWithCache>>>()
    for (const code of codesToCompute) {
      const rules = await getPromotionRulesWithCache(code, container)
      rulesByCode.set(code, rules)
    }
    
    const now = Date.now()
    const activePromoCodes = codesToCompute.filter((code: string) => {
      const rules = rulesByCode.get(code)
      if (!rules || rules.status !== 'active') return false
      if (rules.campaign_ends_at != null && new Date(rules.campaign_ends_at).getTime() < now) return false
      if (rules.campaign_starts_at != null && new Date(rules.campaign_starts_at).getTime() > now) return false
      return true
    })
    
    const promoTypeMap = new Map<string, string>()
    const promoPercentageRateMap = new Map<string, number>()
    rulesByCode.forEach((rules, code) => {
      if (rules?.application_method_type) {
        promoTypeMap.set(code, rules.application_method_type)
      }
      if (rules?.application_method_percentage_rate != null && rules.application_method_percentage_rate > 0) {
        promoPercentageRateMap.set(code, rules.application_method_percentage_rate)
      }
    })
    
    // Currency normalization using application_method_id from cache
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    for (const code of activePromoCodes) {
      const rules = rulesByCode.get(code)
      if (!rules?.application_method_id || !rules.application_method_currency_code) continue
      const currentCurrency = rules.application_method_currency_code
      const normalizedCurrency = currentCurrency.toLowerCase()
      if (currentCurrency !== normalizedCurrency) {
        await knex('promotion_application_method')
          .where('id', rules.application_method_id)
          .update({
            currency_code: normalizedCurrency,
            updated_at: new Date()
          })
      }
    }

    // CRITICAL: Sort so percentage promotions are applied FIRST (on the original subtotal),
    // and fixed-amount promotions are applied AFTER.
    // Medusa's computeActions ignores the order we pass when given multiple codes, and processes
    // them in its own internal order. By calling it sequentially (one promotion at a time),
    // we ensure each promotion is processed in the correct order with the correct base amount.
    activePromoCodes.sort((a: string, b: string) => {
      const typeA = promoTypeMap.get(a) || 'fixed'
      const typeB = promoTypeMap.get(b) || 'fixed'
      if (typeA === 'percentage' && typeB !== 'percentage') return -1
      if (typeA !== 'percentage' && typeB === 'percentage') return 1
      return 0
    })

    if (activePromoCodes.length === 0) {
      console.error('[get-actions-to-compute] No active promotions found for codes:', codesToCompute)
      return new StepResponse({
        actions: [],
        validatedPromotionCodes: []
      })
    }

    // Build code -> promo_code_upper_limit map for capping (priority: cap must not be exceeded)
    const promoCapMap = new Map<string, number>()
    for (const code of activePromoCodes) {
      try {
        const rules = await getPromotionRulesWithCache(code, container)
        const cap = rules?.promo_code_upper_limit
        promoCapMap.set(code, typeof cap === 'number' && cap > 0 ? cap : 0)
      } catch {
        promoCapMap.set(code, 0)
      }
    }
    // Use Medusa's computeActions through our custom service
    // Medusa handles stacking validation internally when multiple codes are passed
    // Custom service handles eligibility filtering (seller, product, first customer, etc.)
    const cartAny = cart as any
    const customer = cartAny.customer || null
    // Extract customer_id from cart (it's at root level) or from customer object
    // CRITICAL: Medusa needs customer_id for campaign budget tracking when budget has attribute: 'customer_id'
    const customerId = cartAny.customer_id || customer?.id || null
    
    const applicationContext = {
      cart: cart,
      customer: customer,
      customer_id: customerId, // CRITICAL: Medusa needs customer_id for campaign budget tracking
      region: cartAny.region || null,
      currency_code: normalizedCurrencyCode
    }
    
    let actionsToCompute: any[] = []
    
    try {
      // CRITICAL FIX: Call computeActions sequentially, one promotion at a time, in the sorted order.
      // Medusa's computeActions ignores the order we pass when given multiple codes, and processes
      // them in its own internal order. By calling it once per promotion, we ensure:
      // 1. Each promotion is processed in the correct order (percentage first, then fixed)
      // 2. Each subsequent promotion sees the cart with previous adjustments applied
      // 3. The cart items' unit_price is updated after each promotion to reflect the new base
      
      // Create a working copy of cart items to track price changes
      // Track both per-unit price (for base calculation) and quantity (for total line amounts)
      const workingCartItems = (cart.items || []).map((item: any) => {
        const unitPrice = parseBigNumberValue(item.unit_price)
        const quantity = Math.max(parseBigNumberValue(item.quantity) || 1, 1)
        return {
          ...item,
          currentUnitPrice: unitPrice,
          originalUnitPrice: unitPrice,
          itemQuantity: quantity
        }
      })
      
      // Process each promotion sequentially in the sorted order
      for (const promoCode of activePromoCodes) {
        // Create a context with updated cart items (reflecting previous discounts)
        const updatedContext = {
          ...applicationContext,
          cart: {
            ...applicationContext.cart,
            items: workingCartItems.map((item: any) => ({
              ...item,
              unit_price: item.currentUnitPrice
            }))
          }
        }
        
        // Call computeActions for this single promotion
        const singlePromoActions = await promotionService.computeActions(
          [promoCode],
          updatedContext
        )
        
        if (singlePromoActions && singlePromoActions.length > 0) {
          // When stacking percentage promos, Medusa's computeActions uses original unit price for percentage.
          // Correct each percentage action to use the current (discounted) unit price we passed in context.
          // Priority: apply promo_code_upper_limit cap so discount never exceeds cap (e.g. 300 for zilo3).
          const isPercentage = promoTypeMap.get(promoCode) === 'percentage'
          let percentageRate = promoPercentageRateMap.get(promoCode)
          // Fallback: derive rate when application_method.percentage_rate was not loaded.
          // Medusa returns total LINE amount (unit_price × quantity × rate/100), so divide by both
          // originalUnitPrice AND quantity to recover the actual percentage rate.
          // SPECIAL CASE: when Medusa's custom service already capped the raw amount (raw ≈ cap),
          // the derived rate would be too small for discounted prices. In that case, force the rate
          // so our cap check below will produce exactly the cap.
          if (isPercentage && (percentageRate == null || isNaN(percentageRate ?? NaN) || (percentageRate ?? -1) < 0)) {
            const firstItemAction = singlePromoActions.find((a: any) => (a as any).item_id != null && 'amount' in a)
            if (firstItemAction) {
              const aid = String((firstItemAction as any).item_id)
              const item = workingCartItems.find((i: any) => String(i?.id ?? (i as any)?.item_id ?? '') === aid)
              const amt = parseBigNumberValue((firstItemAction as any).amount)
              const originalPrice = item && typeof (item as any).originalUnitPrice === 'number' ? (item as any).originalUnitPrice : (item?.currentUnitPrice ?? 0)
              const qty = Math.max((item as any)?.itemQuantity ?? 1, 1)
              const fallbackCap = promoCapMap.get(promoCode) ?? 0
              if (item && originalPrice > 0 && qty > 0 && amt >= 0) {
                if (fallbackCap > 0 && amt >= fallbackCap * 0.99) {
                  // Medusa already applied the cap. Force percentageRate so correctAmount just exceeds
                  // the cap, ensuring our own cap check below brings totalCorrect down to exactly cap.
                  const currentBase = (item as any).currentUnitPrice ?? originalPrice
                  percentageRate = currentBase > 0 ? (fallbackCap / (currentBase * qty)) * 100 * 1.001 : undefined
                } else {
                  percentageRate = (amt / (originalPrice * qty)) * 100
                }
              }
            }
          }
          if (isPercentage && percentageRate != null && percentageRate >= 0) {
            try {
              const itemIdOf = (i: any) => String(i?.id ?? (i as any)?.item_id ?? '')
              const actionsWithCorrectAmounts: Array<{ action: any; amount: number }> = []
              for (const action of singlePromoActions) {
                const aid = action && (action as any).item_id != null ? String((action as any).item_id) : ''
                if (aid && 'amount' in action) {
                  const item = workingCartItems.find((i: any) => itemIdOf(i) === aid)
                  if (item) {
                    const basePrice = item.currentUnitPrice
                    const qty = Math.max((item as any).itemQuantity ?? 1, 1)
                    // correctAmount = total LINE discount (unit_price × quantity × rate/100)
                    const correctAmount = Math.round((basePrice * percentageRate * qty) / 100)
                    actionsWithCorrectAmounts.push({ action, amount: correctAmount })
                  }
                }
              }
              if (actionsWithCorrectAmounts.length > 0) {
                const totalCorrect = actionsWithCorrectAmounts.reduce((sum, { amount }) => sum + amount, 0)
                const cap = promoCapMap.get(promoCode) ?? 0
                const totalMedusa = actionsWithCorrectAmounts.reduce(
                  (sum, { action }) => sum + parseBigNumberValue((action as any).amount),
                  0
                )
                let finalAmounts: number[]
                if (cap > 0 && totalCorrect > cap) {
                  const capRatio = cap / totalCorrect
                  let cappedTotal = 0
                  finalAmounts = actionsWithCorrectAmounts.map(({ amount }) => {
                    const capped = roundToTwoDecimals(amount * capRatio)
                    cappedTotal += capped
                    return capped
                  })
                  const roundingDiff = cap - cappedTotal
                  if (Math.abs(roundingDiff) > 0.001 && finalAmounts.length > 0) {
                    const largestIndex = finalAmounts.reduce(
                      (maxIdx, amt, idx) => amt > finalAmounts[maxIdx] ? idx : maxIdx,
                      0
                    )
                    finalAmounts[largestIndex] = roundToTwoDecimals(finalAmounts[largestIndex] + roundingDiff)
                  }
                } else if (cap > 0 && totalMedusa >= cap * 0.99 && totalCorrect < totalMedusa) {
                  // Medusa already applied the cap (multi-item); our derived rate gave totalCorrect < cap.
                  // Scale our corrected amounts up so total = cap, preserving proportion.
                  const scaleUp = totalCorrect > 0 ? cap / totalCorrect : 0
                  let scaledTotal = 0
                  finalAmounts = actionsWithCorrectAmounts.map(({ amount }) => {
                    const scaled = roundToTwoDecimals(amount * scaleUp)
                    scaledTotal += scaled
                    return scaled
                  })
                  const roundingDiff = cap - scaledTotal
                  if (Math.abs(roundingDiff) > 0.001 && finalAmounts.length > 0) {
                    const largestIndex = finalAmounts.reduce(
                      (maxIdx, amt, idx) => amt > finalAmounts[maxIdx] ? idx : maxIdx,
                      0
                    )
                    finalAmounts[largestIndex] = roundToTwoDecimals(finalAmounts[largestIndex] + roundingDiff)
                  }
                } else {
                  finalAmounts = actionsWithCorrectAmounts.map(({ amount }) => amount)
                }
                actionsWithCorrectAmounts.forEach(({ action }, i) => {
                  ;(action as { amount: number }).amount = finalAmounts[i] ?? 0
                })
              }
            } catch (err) {
              console.error('[get-actions-to-compute] Error correcting stacked percentage / cap:', err)
              // Leave amounts as returned by computeActions
            }
          }
          actionsToCompute.push(...singlePromoActions)
          
          // Apply adjustments to working cart items for next iteration.
          // action.amount is a TOTAL LINE discount (unit_price × quantity × rate/100).
          // currentUnitPrice tracks the PER-UNIT price, so divide by quantity before subtracting.
          singlePromoActions.forEach((action: any) => {
            const aid = action?.item_id != null ? String(action.item_id) : ''
            if (aid && 'amount' in action) {
              const item = workingCartItems.find((i: any) => String(i?.id ?? i?.item_id ?? '') === aid)
              if (item) {
                const totalLineDiscount = parseBigNumberValue(action.amount)
                const qty = Math.max((item as any).itemQuantity ?? 1, 1)
                const perUnitDiscount = totalLineDiscount / qty
                item.currentUnitPrice = Math.max(0, item.currentUnitPrice - perUnitDiscount)
              }
            }
          })
        }
      }
      
    } catch (error: any) {
      // Custom service filters actions instead of throwing validation errors
      // Only handle actual errors (database, network, etc.)
      console.error(`[get-actions-to-compute] Error computing actions:`, error)
      actionsToCompute = []
    }
    
    // Return actions and the promotion codes that were validated
    return new StepResponse({
      actions: actionsToCompute,
      validatedPromotionCodes: activePromoCodes
    })
  }
)