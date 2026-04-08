import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { refetchCartWithDeliveryDetails } from "./helpers"
import { defaultGetCartFields } from "../../carts/query-config"
import { getCartPromise } from "../../../../workflows/delivery-promise/workflows/get-cart-promise"
import { roundToTwoDecimals } from "../../../../shared/utils/calculate-discount-amount"
import { getPromotionRulesWithCache, getActivePromotionsEnriched } from "../../../../shared/utils/promotion-cache"

/**
 * Cleanup automatic promotion adjustments when manual promotions exist
 * Only removes automatic promotions with override_existing = true
 * This is a defensive check that runs after cart refresh to ensure
 * manual promotions take precedence over override automatic ones
 */
export async function cleanupAutoPromotionsIfManualExists(
  cartId: string,
  scope: MedusaContainer
): Promise<{ cleanedCart: any; wasCleanedUp: boolean } | null> {
  const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // Get all cart promotions for this cart
  const cartPromotions = await knex('cart_promotion')
    .select(['id', 'promotion_id'])
    .where('cart_id', cartId)
    .whereNull('deleted_at')

  if (!cartPromotions || cartPromotions.length === 0) {
    return null
  }

  const promotionIds = cartPromotions.map(cp => cp.promotion_id).filter(Boolean)
  
  if (promotionIds.length === 0) {
    return null
  }

  // Check if any of these promotions are manual (not automatic)
  const allActivePromotions = await getActivePromotionsEnriched(scope)
  const promotionIdSet = new Set(promotionIds)
  const promotions = (allActivePromotions || []).filter(
    (p: any) => p && p.id && promotionIdSet.has(p.id)
  )

  // Separate manual and automatic promotions in the cart
  const manualPromotions = promotions.filter(p => !p.is_automatic)
  const autoPromotions = promotions.filter(p => p.is_automatic)

  // Only cleanup if BOTH manual and automatic promotions exist in cart
  if (!manualPromotions || manualPromotions.length === 0 || !autoPromotions || autoPromotions.length === 0) {
    return null
  }

  // Filter automatic promotions to only those with override_existing = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoPromotionsToRemove: any[] = []
  for (const autoPromo of autoPromotions) {
    if (autoPromo.code) {
      const autoPromoRules = await getPromotionRulesWithCache(autoPromo.code, scope)
      // Only remove if override_existing = true (default is true, so undefined/null also means true)
      if (autoPromoRules?.override_existing !== false) {
        autoPromotionsToRemove.push(autoPromo)
      }
    }
  }

  if (autoPromotionsToRemove.length === 0) {
    return null
  }

  // Get automatic promotion IDs that should be removed (only those with override_existing = true)
  const autoPromotionIds = autoPromotionsToRemove.map(p => p.id).filter(Boolean)

  if (autoPromotionIds.length === 0) {
    return null
  }

  // Get line items for this cart using direct knex query
  // (query.graph doesn't support "cart_line_item" entity directly)
  const lineItems = await knex('cart_line_item')
    .select(['id'])
    .where('cart_id', cartId)
    .whereNull('deleted_at')

  if (!lineItems || lineItems.length === 0) {
    return null
  }
  
  const lineItemIds = lineItems.map(li => li.id)

  // Find automatic promotion adjustments for promotions with override_existing = true
  const autoAdjustments = await knex('cart_line_item_adjustment')
    .select(['id', 'promotion_id', 'code', 'amount'])
    .whereIn('item_id', lineItemIds)
    .whereIn('promotion_id', autoPromotionIds)
    .whereNull('deleted_at')

  if (!autoAdjustments || autoAdjustments.length === 0) {
    return null
  }

  // Soft-delete automatic promotion adjustments
  const adjustmentIds = autoAdjustments.map(adj => adj.id)
  await knex('cart_line_item_adjustment')
    .whereIn('id', adjustmentIds)
    .update({ deleted_at: new Date() })

  // Also soft-delete from cart_promotion table
  const autoPromotionIdsToDelete = [...new Set(autoAdjustments.map(adj => adj.promotion_id).filter(Boolean))]
  await knex('cart_promotion')
    .where('cart_id', cartId)
    .whereIn('promotion_id', autoPromotionIdsToDelete as string[])
    .update({ deleted_at: new Date() })

  // Update cart timestamp to ensure totals are recomputed
  await knex('cart')
    .where('id', cartId)
    .update({ updated_at: new Date() })

  return {
    cleanedCart: null, // Will be fetched by caller if needed
    wasCleanedUp: true
  }
}

/**
 * Fetch cart with delivery details and extra charges
 */
export async function fetchCartWithExtras(
  cartId: string,
  scope: MedusaContainer,
  options?: {
    postal_code?: string
    lat?: string
    long?: string
  }
) {
  const query = scope.resolve("query")
  
  // Fetch cart with delivery details
  const cart = await refetchCartWithDeliveryDetails(
    cartId,
    scope,
    defaultGetCartFields
  )

  // Apply delivery promise if requested
  const lat =
    options?.lat !== undefined && options?.lat !== null
      ? Number(options.lat)
      : undefined
  const long =
    options?.long !== undefined && options?.long !== null
      ? Number(options.long)
      : undefined

  if (options?.postal_code || lat !== undefined || long !== undefined) {
    const deliveryPromiseResult = await getCartPromise({
      scope,
      cart,
      postal_code: options?.postal_code,
      lat: Number.isNaN(lat) ? undefined : lat,
      long: Number.isNaN(long) ? undefined : long
    })
    
    cart.deliveryPromiseResult = deliveryPromiseResult
  }

  // Add extra charges
  const { data: extraCharges } = await query.graph({
    entity: "cart_order_extra_charge",
    fields: ["id", "name", "total_amount", "description", "metadata"],
    filters: {
      cart_id: cartId,
      deleted_at: null,
    }
  })
  
  // Round extra charge amounts and calculate total
  const charges = extraCharges || []
  const rawExtraChargeTotal = charges.reduce((sum, charge) => {
    const amount = typeof charge.total_amount === 'string' 
      ? parseFloat(charge.total_amount) 
      : typeof charge.total_amount === 'number' 
        ? charge.total_amount 
        : 0
    return sum + amount
  }, 0)
  
  cart.extra_charges = charges.map((charge: any) => ({
    ...charge,
    amount: roundToTwoDecimals(typeof charge.total_amount === 'string' 
      ? parseFloat(charge.total_amount) 
      : typeof charge.total_amount === 'number' 
        ? charge.total_amount 
        : 0)
  }))
  cart.extra_charge_total = roundToTwoDecimals(rawExtraChargeTotal)

  return cart
}

