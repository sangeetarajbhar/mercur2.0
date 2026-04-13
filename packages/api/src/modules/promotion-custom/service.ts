import {
  PromotionTypes,
  AddItemAdjustmentAction,
  AddShippingMethodAdjustment,
  IPromotionModuleService,
  FilterablePromotionProps,
  FindConfig,
  PromotionDTO,
  Context,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, BigNumber, CampaignBudgetType } from "@medusajs/framework/utils"
import { getPromotionRulesWithCache } from "../../shared/utils/promotion-cache"
import { isFirstCustomer } from "../../shared/utils/check-first-customer"
// import sellerSellerCartLineItemLink from "../../links/seller-cart-line-item"
import { roundToTwoDecimals } from "../../shared/utils/calculate-discount-amount"

/**
 * Custom Promotion Module Service that wraps PromotionModuleService
 *
 * This extends computeActions to add custom eligibility logic.
 * All eligibility checks that were in the workflow step can be moved here.
 *
 * Uses Proxy to delegate all methods to baseService (for promotion service methods like listPromotions)
 * except computeActions which is overridden with custom logic.
 */
export default class CustomPromotionModuleService  {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private container: any
  private baseService: IPromotionModuleService

  constructor(
    baseService: IPromotionModuleService,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    container: any
  ) {
    // Set properties BEFORE returning Proxy
    this.baseService = baseService
    this.container = container

    // Delegate all methods except computeActions, listActivePromotions, and checkPromotionEligibilityReason to baseService using Proxy
    return new Proxy(this, {
      get: (target, prop) => {
        // Override computeActions with our custom implementation
        if (prop === 'computeActions') {
          return target.computeActions.bind(target)
        }
        // Override listActivePromotions with our custom implementation
        if (prop === 'listActivePromotions') {
          return target.listActivePromotions.bind(target)
        }
        // Override checkPromotionEligibilityReason with our custom implementation
        if (prop === 'checkPromotionEligibilityReason') {
          return target.checkPromotionEligibilityReason.bind(target)
        }
        // Delegate all other methods to baseService
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const baseValue = (baseService as any)[prop]
        if (typeof baseValue === 'function') {
          return baseValue.bind(baseService)
        }
        return baseValue
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  }

  async computeActions(
    promotionCodes: string[],
    applicationContext: PromotionTypes.ComputeActionContext,
    options?: PromotionTypes.ComputeActionOptions
  ): Promise<PromotionTypes.ComputeActions[]> {
    const cart = (applicationContext as PromotionTypes.ComputeActionContext & {
      cart?: { items?: unknown[]; shipping_methods?: unknown[]; currency_code?: string }
    }).cart
    const customer = (applicationContext as any).customer
    // Extract customer_id from context or customer object
    // CRITICAL: Medusa needs customer_id for campaign budget tracking when budget has attribute: 'customer_id'
    const customerId = (applicationContext as any).customer_id || customer?.id || null

    const medusaContext: PromotionTypes.ComputeActionContext = cart
      ? {
          items: (cart.items as PromotionTypes.ComputeActionContext['items']) || [],
          shipping_methods: (cart.shipping_methods as PromotionTypes.ComputeActionContext['shipping_methods']) || [],
          currency_code:
            applicationContext.currency_code ||
            cart.currency_code ||
            '',
          // CRITICAL: Preserve customer and customer_id for campaign budget tracking
          customer: customer || null,
          customer_id: customerId,
        }
      : {
          ...applicationContext,
          // Ensure customer_id is present even without cart
          customer_id: customerId,
        }

    // Call Medusa's original logic using baseService.computeActions()
    // This is equivalent to calling super.computeActions() if we were extending
    const baseActions = await this.baseService.computeActions(
      promotionCodes,
      medusaContext,
      options
    )

    // Apply custom eligibility checks
    return this.applyEligibilityChecks(
      baseActions,
      promotionCodes,
      applicationContext
    )
  }

  protected async applyEligibilityChecks(
    actions: PromotionTypes.ComputeActions[],
    promotionCodes: string[],
    applicationContext: PromotionTypes.ComputeActionContext
  ): Promise<PromotionTypes.ComputeActions[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cart = (applicationContext as any).cart
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = applicationContext.customer as any

    if (actions.length === 0) {
      return actions
    }

    // Group actions by promotion code for efficient processing
    const actionsByCode = new Map<string, PromotionTypes.ComputeActions[]>()
    actions.forEach(action => {
      const code = action.code || 'unknown'
      if (!actionsByCode.has(code)) {
        actionsByCode.set(code, [])
      }
      actionsByCode.get(code)!.push(action)
    })

    const filteredActions: PromotionTypes.ComputeActions[] = []
    const query = this.container.resolve(ContainerRegistrationKeys.QUERY)

    // Process each promotion code
    for (const [code, codeActions] of actionsByCode.entries()) {
      // Skip if code is not in the requested codes (might be from automatic promotions)
      if (!promotionCodes.includes(code)) {
        filteredActions.push(...codeActions)
        continue
      }

      // Get promotion rules
      const promotionRules = await getPromotionRulesWithCache(code, this.container)
      if (!promotionRules) {
        filteredActions.push(...codeActions)
        continue
      }

      // 1. Check minimum cart subtotal
      if (promotionRules.cart_sub_total && promotionRules.cart_sub_total > 0) {
        const cartSubtotal = this.calculateCartSubTotal(cart?.items || [])
        if (cartSubtotal < promotionRules.cart_sub_total) {
          continue // Skip all actions for this promotion
        }
      }

      // 2. Check first customer requirement
      if (promotionRules.first_customer) {
        if (!customer?.id) {
          continue // Skip all actions for this promotion
        }

        try {
          // Check has_account flag (matching validation behavior)
          const query = this.container.resolve(ContainerRegistrationKeys.QUERY)
          const { data: [customerData] } = await query.graph({
            entity: 'customer',
            fields: ['id', 'has_account'],
            filters: { id: customer.id }
          })

          if (!customerData?.has_account) {
            continue // Skip if customer doesn't have account
          }

          const isFirstTimeCustomer = await isFirstCustomer(customer.id, this.container)
          if (!isFirstTimeCustomer) {
            continue // Skip all actions for this promotion
          }
        } catch {
          // On error, skip to be safe
          continue
        }
      }

      // 3. Filter actions by seller restrictions
      // CRITICAL: seller-cart-line-item link file is deleted, so seller restriction code is temporarily disabled.
      // const allowedSellerIds = Array.isArray(promotionRules.seller_ids)
      //   ? promotionRules.seller_ids.filter(id => id != null && id !== '')
      //   : []
      // if (promotionRules.for_seller === true && allowedSellerIds.length > 0) {
      //   const itemIds = codeActions
      //     .filter(action => 'item_id' in action)
      //     .map(action => (action as any).item_id)
      //     .filter(Boolean)
      //   if (itemIds.length > 0) {
      //     const { data: sellerMappings } = await query.graph({
      //       entity: sellerSellerCartLineItemLink.entryPoint,
      //       fields: ['line_item_id', 'seller_id'],
      //       filters: {
      //         line_item_id: { $in: itemIds },
      //         deleted_at: { $eq: null }
      //       }
      //     })
      //     const itemSellerMap = new Map<string, string>()
      //     sellerMappings.forEach((m: any) => {
      //       itemSellerMap.set(m.line_item_id, m.seller_id)
      //     })
      //     const sellerFilteredActions = codeActions.filter(action => {
      //       if (!('item_id' in action)) {
      //         return true
      //       }
      //       const itemId = (action as any).item_id
      //       const itemSellerId = itemSellerMap.get(itemId)
      //       if (!itemSellerId) {
      //         return false
      //       }
      //       return allowedSellerIds.includes(itemSellerId)
      //     })
      //     codeActions.length = 0
      //     codeActions.push(...sellerFilteredActions)
      //   }
      // }

      // 4. Filter actions by product restrictions
      const productRuleIds = Array.isArray(promotionRules.product_rule_ids)
        ? promotionRules.product_rule_ids.filter(id => id != null && id !== '')
        : []

      if (productRuleIds.length > 0) {
        // Get cart items map for product_id lookup
        const itemProductMap = new Map<string, string>()
        if (cart?.items) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cart.items.forEach((item: any) => {
            if (item.id && item.product_id) {
              itemProductMap.set(item.id, item.product_id)
            }
          })
        }

        const productFilteredActions = codeActions.filter(action => {
          if (!('item_id' in action)) {
            return true // Shipping adjustments
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const itemId = (action as any).item_id
          const productId = itemProductMap.get(itemId)

          if (!productId) {
            return false
          }

          return productRuleIds.includes(productId)
        })

        codeActions.length = 0
        codeActions.push(...productFilteredActions)
      }

      // 5. Cap discount amounts by promo_code_upper_limit
      if (promotionRules.promo_code_upper_limit && promotionRules.promo_code_upper_limit > 0) {
        // Collect amounts and track totals (use absolute values so mixed signs don't cancel)
        const actionsWithAmounts: Array<{ action: AddItemAdjustmentAction | AddShippingMethodAdjustment; amount: number }> = []
        let rawTotal = 0
        let totalAbs = 0

        codeActions.forEach((action) => {
          if ('amount' in action) {
            const amountAction = action as AddItemAdjustmentAction | AddShippingMethodAdjustment
            // Use parseBigNumberValue to handle BigNumber objects, strings, and numbers
            const rawAmount = amountAction.amount
            const amount = this.parseBigNumberValue(rawAmount)

            actionsWithAmounts.push({ action: amountAction, amount })
            rawTotal += amount
            totalAbs += Math.abs(amount)
          }
        })

        const totalDiscount = totalAbs

        if (totalDiscount > promotionRules.promo_code_upper_limit) {
          // Calculate cap ratio based on absolute totals
          const capRatio = promotionRules.promo_code_upper_limit / totalDiscount

          // Apply proportional capping while preserving the original sign
          let cappedTotal = 0
          const cappedAmounts = actionsWithAmounts.map(({ action, amount }) => {
            const sign = amount < 0 ? -1 : 1
            const absoluteAmount = Math.abs(amount)
            const cappedAbsolute = roundToTwoDecimals(absoluteAmount * capRatio)
            const cappedAmount = sign * cappedAbsolute

            cappedTotal += cappedAmount
            return { action, cappedAmount }
          })

          // Adjust rounding diff so final total matches the upper limit (respect sign)
          const targetTotal = rawTotal < 0
            ? -promotionRules.promo_code_upper_limit
            : promotionRules.promo_code_upper_limit
          const roundingDiff = targetTotal - cappedTotal

          if (Math.abs(roundingDiff) > 0.001 && cappedAmounts.length > 0) {
            const largestIndex = cappedAmounts.reduce(
              (maxIdx, item, idx) =>
                Math.abs(item.cappedAmount) > Math.abs(cappedAmounts[maxIdx].cappedAmount) ? idx : maxIdx,
              0
            )

            cappedAmounts[largestIndex].cappedAmount = roundToTwoDecimals(
              cappedAmounts[largestIndex].cappedAmount + roundingDiff
            )
          }

          // Apply capped amounts back to actions
          cappedAmounts.forEach(({ action, cappedAmount }) => {
            // Convert back to BigNumber to match Medusa's expected format
            // cappedAmount already has the correct sign from the capping logic above
            action.amount = new BigNumber(cappedAmount)
          })
        }
      }

      // 6. Check per-customer campaign budget usage (usage_per / USE_BY_ATTRIBUTE)
      const customerId = (applicationContext as any).customer_id ||
                         (applicationContext as any).customer?.id || null
      if (customerId) {
        const usageError = await this.checkPerCustomerCampaignUsage(code, customerId)
        if (usageError) {
          // Skip all actions for this promotion - customer exceeded limit
          continue
        }
      }

      // Add filtered/capped actions to result
      filteredActions.push(...codeActions)
    }

    return filteredActions
  }

  /**
   * Check why a promotion code failed eligibility checks.
   * Returns the reason code and message, or null if eligible.
   */
  async checkPromotionEligibilityReason(
    promotionCode: string,
    cart: { items?: Array<{ id?: string; product_id?: string; quantity?: unknown; unit_price?: unknown }>; customer?: { id?: string } },
    customer?: { id?: string }
  ): Promise<{ reason: string; message: string } | null> {
    try {
      const promotionRules = await getPromotionRulesWithCache(promotionCode, this.container)

      if (!promotionRules) {
        return {
          reason: "promotion_not_found",
          message: `Promotion code '${promotionCode}' was not found or is no longer active.`
        }
      }

      const customerId = customer?.id || cart?.customer?.id

      // 1. Check minimum cart subtotal
      if (promotionRules.cart_sub_total && promotionRules.cart_sub_total > 0) {
        const cartSubtotal = this.calculateCartSubTotal(cart?.items || [])
        if (cartSubtotal < promotionRules.cart_sub_total) {
          return {
            reason: "minimum_cart_value",
            message: `Promotion code '${promotionCode}' requires a minimum cart value of INR ${promotionRules.cart_sub_total}. Your current cart value is INR ${cartSubtotal.toFixed(2)}.`
          }
        }
      }

      // 2. Check first customer requirement
      if (promotionRules.first_customer) {
        if (!customerId) {
          return {
            reason: "first_customer_login_required",
            message: `Promotion code '${promotionCode}' is only available for first-time customers. Please log in to check your eligibility.`
          }
        }

        try {
          const query = this.container.resolve(ContainerRegistrationKeys.QUERY)
          const { data: [customerData] } = await query.graph({
            entity: 'customer',
            fields: ['id', 'has_account'],
            filters: { id: customerId }
          })

          if (!customerData?.has_account) {
            return {
              reason: "first_customer_account_required",
              message: `Promotion code '${promotionCode}' is only available for first-time customers with an account.`
            }
          }

          const isFirstTimeCustomer = await isFirstCustomer(customerId, this.container)
          if (!isFirstTimeCustomer) {
            return {
              reason: "first_customer_only",
              message: `Promotion code '${promotionCode}' is only available for first-time customers.`
            }
          }
        } catch {
          return {
            reason: "first_customer_check_failed",
            message: `Promotion code '${promotionCode}' eligibility could not be verified.`
          }
        }
      }

      // 3. Check seller restrictions
      // seller-cart-line-item link file is deleted, so seller restriction check is temporarily disabled.
      // const allowedSellerIds = Array.isArray(promotionRules.seller_ids)
      //   ? promotionRules.seller_ids.filter(id => id != null && id !== '')
      //   : []
      // if (promotionRules.for_seller === true && allowedSellerIds.length > 0) {
      //   try {
      //     const query = this.container.resolve(ContainerRegistrationKeys.QUERY)
      //     const itemIds = (cart?.items || []).map((item) => item.id).filter(Boolean)
      //     if (itemIds.length > 0) {
      //       const { data: sellerMappings } = await query.graph({
      //         entity: sellerSellerCartLineItemLink.entryPoint,
      //         fields: ['line_item_id', 'seller_id'],
      //         filters: {
      //           line_item_id: { $in: itemIds },
      //           deleted_at: { $eq: null }
      //         }
      //       })
      //       const cartSellerIds = new Set(sellerMappings.map((m: any) => m.seller_id).filter(Boolean))
      //       const hasAllowedSeller = Array.from(cartSellerIds).some((sellerId: any) => allowedSellerIds.includes(sellerId))
      //       if (!hasAllowedSeller) {
      //         return {
      //           reason: "seller_restriction",
      //           message: `Promotion code '${promotionCode}' is not applicable to the products in your cart due to seller restrictions.`
      //         }
      //       }
      //     } else {
      //       return {
      //         reason: "no_eligible_items",
      //         message: `Promotion code '${promotionCode}' cannot be applied as there are no eligible items in your cart.`
      //       }
      //     }
      //   } catch {
      //     return null
      //   }
      // }

      // 4. Check product restrictions
      const productRuleIds = Array.isArray(promotionRules.product_rule_ids)
        ? promotionRules.product_rule_ids.filter(id => id != null && id !== '')
        : []

      if (productRuleIds.length > 0) {
        const cartProductIds = new Set((cart?.items || []).map((item) => item.product_id).filter(Boolean))
        const hasEligibleProduct = Array.from(cartProductIds).some((productId: any) => productRuleIds.includes(productId))

        if (!hasEligibleProduct) {
          return {
            reason: "product_restriction",
            message: `Promotion code '${promotionCode}' is not applicable to the products in your cart.`
          }
        }
      }

      // 5. Check per-customer campaign budget usage
      if (customerId) {
        const usageError = await this.checkPerCustomerCampaignUsage(promotionCode, customerId)
        if (usageError) {
          return usageError
        }
      }

      return null
    } catch {
      return null
    }
  }

  private calculateCartSubTotal(
    cartItems: Array<{ quantity?: unknown; unit_price?: unknown }>
  ): number {
    return cartItems.reduce((sum, item) => {
      return (
        sum +
        this.parseBigNumberValue(item.quantity) *
          this.parseBigNumberValue(item.unit_price)
      )
    }, 0)
  }

  private parseBigNumberValue(value: unknown): number {
    if (typeof value === 'string') {
      return Number(value) || 0
    }
    if (typeof value === 'number') {
      return value
    }
    if (value && typeof value === 'object' && 'numeric' in value) {
      const numeric = (value as { numeric?: number }).numeric
      return typeof numeric === 'number' ? numeric : 0
    }
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

  private async checkPerCustomerCampaignUsage(
    promotionCode: string,
    customerId: string
  ): Promise<{ reason: string; message: string } | null> {
    try {
      const [promotion] = await (this.baseService as any).promotionService_.list(
        { code: promotionCode },
        { relations: ['campaign', 'campaign.budget'] }
      )

      if (!promotion?.campaign?.budget) {
        return null
      }

      const budget = promotion.campaign.budget

      if (budget.type !== CampaignBudgetType.USE_BY_ATTRIBUTE) {
        return null
      }

      const perCustomerLimit = Number(budget.limit)
      if (!perCustomerLimit) {
        return null
      }

      const [usageRecord] = await (this.baseService as any).campaignBudgetUsageService_.list({
        budget_id: budget.id,
        attribute_value: customerId,
      })

      const perCustomerUsed = Number(usageRecord?.used) || 0

      if (perCustomerUsed >= perCustomerLimit) {
        return {
          reason: 'customer_usage_limit_exceeded',
          message: `You have already used the promotion '${promotionCode}' the maximum number of times allowed (${perCustomerLimit} time${perCustomerLimit !== 1 ? 's' : ''}).`,
        }
      }

      return null
    } catch (error) {
      console.error(`[PerCustomerUsage] Error checking per-customer campaign usage for "${promotionCode}":`, error)
      return null
    }
  }

  async listActivePromotions(
    filters?: FilterablePromotionProps,
    config?: FindConfig<PromotionDTO>,
    sharedContext?: Context
  ): Promise<PromotionDTO[]> {
    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeFilters: any = {
      status: ["active"],
      $or: [
        {
          campaign_id: null,
          ...filters,
        },
        {
          ...filters,
          campaign: {
            ...filters?.campaign,
            $and: [
              {
                $or: [{ starts_at: null }, { starts_at: { $lte: now } }],
              },
              {
                $or: [{ ends_at: null }, { ends_at: { $gte: now } }],
              },
            ],
          },
        },
      ],
    }

    return await this.baseService.listPromotions(
      activeFilters,
      config,
      sharedContext
    )
  }
}

