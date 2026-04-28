import {
  AddItemAdjustmentAction,
  AddShippingMethodAdjustment,
  CampaignBudgetExceededAction,
  ComputeActions,
  PromotionDTO,
  RemoveItemAdjustmentAction,
  RemoveShippingMethodAdjustment,
} from "@medusajs/framework/types"
import { ComputedActions, ContainerRegistrationKeys, PromotionActions, MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { Knex } from "knex"
import { getCustomPromotionService } from "../../../shared/utils/get-custom-promotion-service"
import { getPromotionRulesWithCache } from "../../../shared/utils/promotion-cache"

/**
 * The details of the actions computed by the Promotion Module.
 */
export interface PrepareAdjustmentsFromPromotionActionsStepInput {
  /**
   * The actions computed by the Promotion Module.
   */
  actions: ComputeActions[],

  /**
   * The cart ID.
   */
  cart_id: string

  /**
   * The validated promotion codes.
   */
  validatedPromotionCodes?: string[]

  /**
   * The fresh cart data.
   */
  freshCart?: any

  /**
   * The action to perform (ADD, REMOVE, REPLACE).
   */
  action?: string

  /**
   * The promotion codes to remove.
   */
  promotionCodesToRemove?: string[]

  /**
   * The actions result.
   */
  actionsResult?: any

  /**
   * The original promo codes from input.
   */
  promo_codes?: string[]

  /**
   * If true, promotions that no longer produce adjustments will be silently removed
   * (no error thrown). Intended for cart refresh flows.
   */
  silent_remove?: boolean
}

/**
 * The details of the adjustments to create and remove.
 */
export interface PrepareAdjustmentsFromPromotionActionsStepOutput {
  /**
   * The line item adjustments to create.
   */
  lineItemAdjustmentsToCreate: {
    /**
     * The promotion code that computed the adjustment.
     */
    code: string
    /**
     * The amount of the adjustment.
     */
    amount: number
    /**
     * The ID of the line item to adjust.
     */
    item_id: string
    /**
     * The ID of the applied promotion.
     */
    promotion_id?: string
  }[]
  /**
   * The line item adjustment IDs to remove (from actions only).
   */
  lineItemAdjustmentIdsToRemove: string[]
  /**
   * The final combined line item adjustment IDs to remove (includes fetched existing adjustments).
   */
  finalAdjustmentIdsToRemove: string[]
  /**
   * The shipping method adjustments to create.
   */
  shippingMethodAdjustmentsToCreate: {
    /**
     * The promotion code that computed the adjustment.
     */
    code: string
    /**
     * The amount of the adjustment.
     */
    amount: number
    /**
     * The ID of the shipping method to adjust.
     */
    shipping_method_id: string
    /**
     * The ID of the applied promotion.
     */
    promotion_id?: string
  }[]
  /**
   * The shipping method adjustment IDs to remove.
   */
  shippingMethodAdjustmentIdsToRemove: string[]
  /**
   * The promotion codes that were computed.
   */
  computedPromotionCodes: string[]
  /**
   * The filtered line item adjustments (after filtering rejected auto promo codes).
   */
  filteredLineItemAdjustments: {
    code: string
    amount: number
    item_id: string
    promotion_id?: string
  }[]
  /**
   * The final computed promotion codes (validated and filtered).
   */
  finalComputedPromotionCodes: string[]
}

export const prepareAdjustmentsFromPromotionActionsStepId =
  "prepare-adjustments-from-promotion-actions"

/**
 * Handle the case when there are no actions to process.
 * Still computes final promotion codes and fetches existing adjustments for REMOVE/REPLACE actions.
 */
async function handleEmptyActionsCase(
  data: PrepareAdjustmentsFromPromotionActionsStepInput,
  knex: Knex,
  container: any
): Promise<PrepareAdjustmentsFromPromotionActionsStepOutput> {
  const { finalComputedPromotionCodes } = await computeFinalPromotionCodes({
    validatedPromotionCodes: data.validatedPromotionCodes,
    freshCart: data.freshCart,
    action: data.action,
    promotionCodesToRemove: data.promotionCodesToRemove,
    actionsResult: data.actionsResult,
    lineItemAdjustmentsToCreate: [],
    shippingMethodAdjustmentsToCreate: [],
    promo_codes: data.promo_codes,
    silent_remove: data.silent_remove,
    container,
  })

  // CRITICAL FIX: Pass incoming promo codes to fetchExistingAdjustments
  // This allows us to remove existing adjustments for codes being re-applied in ADD action
  const incomingPromoCodes = data.validatedPromotionCodes || data.promo_codes || []

  // Fetch existing adjustments for REPLACE/ADD/REMOVE actions
  const specificAdjustmentIds = await fetchExistingAdjustments(
    data.cart_id,
    data.action,
    data.promotionCodesToRemove || [],
    knex,
    incomingPromoCodes // Pass incoming codes
  )

  const finalAdjustmentIdsToRemove = [...new Set([...specificAdjustmentIds])]

  return {
    lineItemAdjustmentsToCreate: [],
    lineItemAdjustmentIdsToRemove: [],
    shippingMethodAdjustmentsToCreate: [],
    shippingMethodAdjustmentIdsToRemove: [],
    computedPromotionCodes: [],
    filteredLineItemAdjustments: [],
    finalComputedPromotionCodes,
    finalAdjustmentIdsToRemove,
  } as PrepareAdjustmentsFromPromotionActionsStepOutput
}

/**
 * Resolve promotions by their codes and create a map for quick lookup.
 */
async function resolvePromotionsByCode(
  promotionCodes: string[],
  container: any
): Promise<Map<string, PromotionDTO>> {
  const promotionsMap = new Map<string, PromotionDTO>()

  for (const code of promotionCodes) {

    const rules = await getPromotionRulesWithCache(code, container)

    if (!rules?.promotion_id) {
      continue
    }

    // We only need id and code for mapping adjustments to promotions.
    promotionsMap.set(
      code,
      {
        id: rules.promotion_id,
        code: rules.code ?? code,
      } as PromotionDTO
    )
  }

  return promotionsMap
}

/**
 * Process promotion actions and collect adjustments to create and remove.
 */
function processPromotionActions(
  actions: ComputeActions[],
  promotionsMap: Map<string, PromotionDTO>,
  silent_remove?: boolean
): {
  lineItemAdjustmentsToCreate: PrepareAdjustmentsFromPromotionActionsStepOutput["lineItemAdjustmentsToCreate"]
  rawLineItemAdjustmentIdsToRemove: string[]
  shippingMethodAdjustmentsToCreate: PrepareAdjustmentsFromPromotionActionsStepOutput["shippingMethodAdjustmentsToCreate"]
  shippingMethodAdjustmentIdsToRemove: string[]
} {
  const lineItemAdjustmentsToCreate: PrepareAdjustmentsFromPromotionActionsStepOutput["lineItemAdjustmentsToCreate"] = []
  const rawLineItemAdjustmentIdsToRemove: string[] = []
  const shippingMethodAdjustmentsToCreate: PrepareAdjustmentsFromPromotionActionsStepOutput["shippingMethodAdjustmentsToCreate"] = []
  const shippingMethodAdjustmentIdsToRemove: string[] = []

  // Filter out campaign budget exceeded actions if silent_remove is enabled
  // Otherwise, throw error for manual application
  const filteredActions: ComputeActions[] = []
  for (const action of actions) {
    if (action.action === "campaignBudgetExceeded") {
      const exceededAction = action as CampaignBudgetExceededAction
      
      // If silent_remove is true (cart refresh), skip this action instead of throwing
      if (silent_remove) {
        continue // Skip this action, don't throw
      }
      
      // Otherwise throw error (manual application)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `The campaign for promotion '${exceededAction.code}' has reached its budget limit and is no longer available.`,
        "campaign_budget_exhausted"
      )
    }
    filteredActions.push(action)
  }

  // Process normal adjustment actions (using filtered actions)
  for (const action of filteredActions) {
    switch (action.action) {
      case ComputedActions.ADD_ITEM_ADJUSTMENT: {
        const itemAction = action as AddItemAdjustmentAction
        lineItemAdjustmentsToCreate.push({
          code: action.code,
          amount: itemAction.amount as number,
          is_tax_inclusive: itemAction.is_tax_inclusive,
          item_id: itemAction.item_id,
          promotion_id: promotionsMap.get(action.code)?.id,
        } as PrepareAdjustmentsFromPromotionActionsStepOutput["lineItemAdjustmentsToCreate"][number])
        break
      }
      case ComputedActions.REMOVE_ITEM_ADJUSTMENT:
        rawLineItemAdjustmentIdsToRemove.push(
          (action as RemoveItemAdjustmentAction).adjustment_id
        )
        break
      case ComputedActions.ADD_SHIPPING_METHOD_ADJUSTMENT: {
        const shippingAction = action as AddShippingMethodAdjustment
        shippingMethodAdjustmentsToCreate.push({
          code: action.code,
          amount: shippingAction.amount as number,
          shipping_method_id: shippingAction.shipping_method_id,
          promotion_id: promotionsMap.get(action.code)?.id,
        })
        break
      }
      case ComputedActions.REMOVE_SHIPPING_METHOD_ADJUSTMENT:
        shippingMethodAdjustmentIdsToRemove.push(
          (action as RemoveShippingMethodAdjustment).adjustment_id
        )
        break
    }
  }

  return {
    lineItemAdjustmentsToCreate,
    rawLineItemAdjustmentIdsToRemove,
    shippingMethodAdjustmentsToCreate,
    shippingMethodAdjustmentIdsToRemove,
  }
}

/**
 * Validate adjustment IDs against the database to ensure they belong to the cart.
 * This prevents security issues where adjustment IDs from other carts could be removed.
 */
async function validateAdjustmentIds(
  rawAdjustmentIds: string[],
  knex: Knex
): Promise<string[]> {
  if (rawAdjustmentIds.length === 0) {
    return []
  }

  const validAdjustments = await knex("cart_line_item_adjustment")
    .join("cart_line_item", "cart_line_item_adjustment.item_id", "cart_line_item.id")
    .whereIn("cart_line_item_adjustment.id", rawAdjustmentIds)
    .whereNull("cart_line_item_adjustment.deleted_at")
    .select("cart_line_item_adjustment.id")

  return validAdjustments.map((adj) => adj.id)
}

/**
 * Compute promotion codes from adjustments.
 */
function computePromotionCodesFromAdjustments(
  lineItemAdjustments: PrepareAdjustmentsFromPromotionActionsStepOutput["lineItemAdjustmentsToCreate"],
  shippingMethodAdjustments: PrepareAdjustmentsFromPromotionActionsStepOutput["shippingMethodAdjustmentsToCreate"]
): string[] {
  return [
    ...lineItemAdjustments,
    ...shippingMethodAdjustments,
  ].map((adjustment) => adjustment.code)
}

/**
 * Combine adjustment IDs from actions and fetched existing adjustments.
 */
function combineAdjustmentIdsToRemove(
  validatedAdjustmentIds: string[],
  fetchedAdjustmentIds: string[]
): string[] {
  return [...new Set([...validatedAdjustmentIds, ...fetchedAdjustmentIds])]
}

/**
 * This step prepares the line item or shipping method adjustments using
 * actions computed by the Promotion Module.
 *
 * @example
 * const data = prepareAdjustmentsFromPromotionActionsStep({
 *   "actions": [{
 *     "action": "addItemAdjustment",
 *     "item_id": "litem_123",
 *     "amount": 10,
 *     "code": "10OFF",
 *   }]
 * })
 */
export const prepareAdjustmentsFromPromotionActionsStep = createStep(
  prepareAdjustmentsFromPromotionActionsStepId,
  async (
    data: PrepareAdjustmentsFromPromotionActionsStepInput,
    { container }
  ) => {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
    const { actions = [] } = data

    if (!actions.length) {
      const result = await handleEmptyActionsCase(data, knex, container)
      return new StepResponse(result)
    }

    // Resolve promotions by code
    const promotionsMap = await resolvePromotionsByCode(
      actions.map((a) => a.code),
      container
    )

    // Process actions to collect adjustments
    const {
      lineItemAdjustmentsToCreate,
      rawLineItemAdjustmentIdsToRemove,
      shippingMethodAdjustmentsToCreate,
      shippingMethodAdjustmentIdsToRemove,
    } = processPromotionActions(actions, promotionsMap, data.silent_remove)

    // Use adjustments directly since capping is done in CustomPromotionModuleService
    const cappedLineItemAdjustments = lineItemAdjustmentsToCreate

    // Validate adjustment IDs against database
    const lineItemAdjustmentIdsToRemove = await validateAdjustmentIds(
      rawLineItemAdjustmentIdsToRemove,
      knex
    )

    // Compute promotion codes from adjustments
    const computedPromotionCodes = computePromotionCodesFromAdjustments(
      cappedLineItemAdjustments,
      shippingMethodAdjustmentsToCreate
    )

    // Use adjustments directly for manual promotions
    const filteredLineItemAdjustments = cappedLineItemAdjustments

    // Get rejected codes from cart metadata to filter them out
    let rejectedCodes: string[] = []
    if (data.freshCart?.metadata) {
      let metadata = data.freshCart.metadata
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata)
        } catch {
          metadata = {}
        }
      }
      rejectedCodes = metadata.rejected_auto_promo_codes || []
    }

    // Compute final promotion codes with validation
    const { finalComputedPromotionCodes: rawFinalComputedPromotionCodes } = await computeFinalPromotionCodes({
      validatedPromotionCodes: data.validatedPromotionCodes,
      freshCart: data.freshCart,
      action: data.action,
      promotionCodesToRemove: data.promotionCodesToRemove,
      actionsResult: data.actionsResult,
      lineItemAdjustmentsToCreate: filteredLineItemAdjustments,
      shippingMethodAdjustmentsToCreate,
      promo_codes: data.promo_codes,
      silent_remove: data.silent_remove,
      container,
    })

    // Filter out rejected codes from final computed promotion codes
    const finalComputedPromotionCodes = rawFinalComputedPromotionCodes.filter(
      (code: string) => !rejectedCodes.includes(code)
    )

    // CRITICAL FIX: Pass incoming promo codes to fetchExistingAdjustments
    // This allows us to remove existing adjustments for codes being re-applied in ADD action
    const incomingPromoCodes = data.validatedPromotionCodes || data.promo_codes || []

    // Fetch existing adjustments for REPLACE/ADD/REMOVE actions
    const specificAdjustmentIds = await fetchExistingAdjustments(
      data.cart_id,
      data.action,
      data.promotionCodesToRemove || [],
      knex,
      incomingPromoCodes // Pass incoming codes
    )

    // Combine adjustment IDs from actions and fetched existing adjustments
    const finalAdjustmentIdsToRemove = combineAdjustmentIdsToRemove(
      lineItemAdjustmentIdsToRemove,
      specificAdjustmentIds
    )

    return new StepResponse({
      lineItemAdjustmentsToCreate: filteredLineItemAdjustments,
      lineItemAdjustmentIdsToRemove,
      shippingMethodAdjustmentsToCreate,
      shippingMethodAdjustmentIdsToRemove,
      computedPromotionCodes,
      filteredLineItemAdjustments,
      finalComputedPromotionCodes,
      finalAdjustmentIdsToRemove,
    } as PrepareAdjustmentsFromPromotionActionsStepOutput)
  }
)

/**
 * Fetch all existing adjustments from database for REPLACE/ADD/REMOVE actions.
 * This includes adjustments for both active AND soft-deleted line items to catch orphaned adjustments.
 */
async function fetchExistingAdjustments(
  cart_id: string,
  action: string | undefined,
  promotionCodesToRemove: string[],
  knex: Knex,
  incomingPromoCodes?: string[] // Add this parameter
): Promise<string[]> {
  // BUG FIX: Normalize action to lowercase to match enum values (case-insensitive comparison)
  const normalizedAction = action?.toLowerCase()

  // CRITICAL FIX: For ADD action, also check if incoming codes already exist
  // This prevents duplicate adjustments when the same code is re-applied
  const shouldFetchForAdd = normalizedAction === PromotionActions.ADD && 
    incomingPromoCodes && 
    incomingPromoCodes.length > 0

  // Only fetch if we need to remove adjustments
  // For ADD: Also fetch if incoming codes might already exist in cart
  if (normalizedAction !== PromotionActions.REPLACE &&
    (normalizedAction !== PromotionActions.REMOVE || promotionCodesToRemove.length === 0) &&
    !shouldFetchForAdd) {
    return []
  }

  // CRITICAL FIX: Fetch ALL adjustments for this cart using JOIN
  // This includes adjustments for both active AND soft-deleted line items
  // This ensures we catch orphaned adjustments that would otherwise be missed
  // IMPORTANT: This query runs AFTER lock is acquired, so it will see adjustments created by concurrent requests
  const allAdjustments = await knex('cart_line_item_adjustment')
    .select([
      'cart_line_item_adjustment.id',
      'cart_line_item_adjustment.code',
      'cart_line_item_adjustment.promotion_id',
      'cart_line_item_adjustment.item_id'
    ])
    .join('cart_line_item', 'cart_line_item_adjustment.item_id', 'cart_line_item.id')
    .where('cart_line_item.cart_id', cart_id)
    .whereNull('cart_line_item_adjustment.deleted_at')
  // Note: We don't filter by cart_line_item.deleted_at to catch orphaned adjustments

  if (allAdjustments.length === 0) {
    return []
  }

  // Filter adjustments based on action
  const trimmedPromoCodesToRemove = promotionCodesToRemove.map((c: string) => c.trim())
  const trimmedIncomingCodes = (incomingPromoCodes || []).map((c: string) => c.trim())

  const adjustmentIds: string[] = []

  for (const adj of allAdjustments) {
    // BUG FIX: Use normalized action for comparison with enum values
    if (normalizedAction === PromotionActions.REPLACE) {
      // REPLACE: remove ALL existing adjustments (including orphaned ones and ones just created by concurrent requests)
      // This is critical to prevent duplicates when two requests run concurrently
      adjustmentIds.push(adj.id)
    } else if (normalizedAction === PromotionActions.REMOVE && adj.code && trimmedPromoCodesToRemove.includes(adj.code.trim())) {
      // REMOVE: only remove specific promotion codes
      adjustmentIds.push(adj.id)
    } else if (shouldFetchForAdd && adj.code && trimmedIncomingCodes.includes(adj.code.trim())) {
      // ADD action: Remove existing adjustments for codes that are being re-applied
      // This prevents duplicate adjustments when the same code is applied multiple times
      adjustmentIds.push(adj.id)
    }
    // Note: computeActions may also return removeItemAdjustment actions for specific adjustments
    // Those are handled via processPromotionActions -> rawLineItemAdjustmentIdsToRemove
    // But we also need to catch cases where computeActions doesn't identify them
  }

  return adjustmentIds
}


/**
 * Compute final promotion codes with validation and error handling.
 */
async function computeFinalPromotionCodes({
  validatedPromotionCodes,
  freshCart,
  action,
  promotionCodesToRemove,
  actionsResult,
  lineItemAdjustmentsToCreate,
  shippingMethodAdjustmentsToCreate,
  promo_codes,
  silent_remove = false,
  container,
}: {
  validatedPromotionCodes?: string[]
  freshCart?: any
  action?: string
  promotionCodesToRemove?: string[]
  actionsResult?: any
  lineItemAdjustmentsToCreate: any[]
  shippingMethodAdjustmentsToCreate: any[]
  promo_codes?: string[]
  silent_remove?: boolean
  container?: any
}): Promise<{ finalComputedPromotionCodes: string[] }> {
  if (!freshCart) {
    return { finalComputedPromotionCodes: validatedPromotionCodes || [] }
  }

  if (action === PromotionActions.REMOVE) {
    // For REMOVE: return existing codes minus the ones being removed
    const existingCodes = freshCart.promotions?.map((p: any) => p?.code).filter(Boolean) || []
    // Trim codes when comparing to handle whitespace issues
    const trimmedPromoCodesToRemove = (promotionCodesToRemove || []).map((c: string) => c.trim())
    const remaining = existingCodes.filter((code: string) => !trimmedPromoCodesToRemove.includes(code.trim()))

    return { finalComputedPromotionCodes: remaining }
  }

  // For ADD/REPLACE: Check if any adjustments were created
  // If no adjustments, throw error instead of silently filtering
  const actions = (actionsResult as any)?.actions || actionsResult || []
  const hasLineItemAdjustments = lineItemAdjustmentsToCreate && lineItemAdjustmentsToCreate.length > 0
  const hasShippingAdjustments = shippingMethodAdjustmentsToCreate && shippingMethodAdjustmentsToCreate.length > 0
  const hasAnyAdjustments = hasLineItemAdjustments || hasShippingAdjustments

  // For REPLACE with empty array (clearing all promotions), don't fail
  if (action === PromotionActions.REPLACE && (!promo_codes || promo_codes.length === 0)) {
    return { finalComputedPromotionCodes: [] }
  }

  // If silent_remove is enabled (cart refresh), we always return the codes that actually produced adjustments.
  // This drops invalid/expired/now-ineligible promotions without failing the cart refresh.
  if (silent_remove) {
    const computedCodes = computePromotionCodesFromAdjustments(
      lineItemAdjustmentsToCreate as any,
      shippingMethodAdjustmentsToCreate as any
    )

    // If no adjustments, silently clear promotions
    if (!hasAnyAdjustments || actions.length === 0) {
      return { finalComputedPromotionCodes: [] }
    }

    return { finalComputedPromotionCodes: Array.from(new Set(computedCodes.map((c) => (c || "").trim()).filter(Boolean))) }
  }

  // For ADD/REPLACE: Fail if no adjustments were created
  // NOTE: This should never be reached if silent_remove is true (handled above)
  if (actions.length === 0 || !hasAnyAdjustments) {
    // Get the codes that were requested but couldn't be applied
    const requestedCodes = validatedPromotionCodes && validatedPromotionCodes.length > 0
      ? validatedPromotionCodes
      : (promo_codes || [])

    // Only check eligibility for specific error messages if we have the necessary data
    // and this is NOT a silent_remove operation (manual application)
    if (!silent_remove && container && freshCart && requestedCodes.length > 0) {
      try {
        const promotionService = getCustomPromotionService(container) as any
        const eligibilityChecks = await Promise.all(
          requestedCodes.map(code => 
            (promotionService as any).checkPromotionEligibilityReason(
              code,
              freshCart,
              freshCart.customer
            )
          )
        )

        // Find the first specific reason, or use generic message
        const firstSpecificReason = eligibilityChecks.find(check => check !== null)
        
        if (firstSpecificReason) {
          // If multiple codes failed, include all codes in the message
          if (requestedCodes.length > 1) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              `${firstSpecificReason.message} This applies to promotion code(s): ${requestedCodes.join(", ")}.`,
              firstSpecificReason.reason
            )
          } else {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              firstSpecificReason.message,
              firstSpecificReason.reason
            )
          }
        }
      } catch (error) {
        // If eligibility check itself fails, re-throw MedusaError, otherwise fall through to generic error
        if (error instanceof MedusaError) {
          throw error
        }
        // Fall through to generic error
      }
    }

    // Fallback to generic error if we couldn't determine specific reason
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Promotion code(s) '${requestedCodes.join(", ")}' could not be applied to this cart. This may be due to seller restrictions, product eligibility rules, or other promotion requirements.`,
      "promotion_not_applicable"
    )
  }

  return { finalComputedPromotionCodes: validatedPromotionCodes || [] }
}
