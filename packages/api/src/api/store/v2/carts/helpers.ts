import { MedusaContainer, IPromotionModuleService } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
  Modules,
} from "@medusajs/framework/utils"
import { HttpTypes } from "@medusajs/framework/types"
import { createISTDateTime } from "../../../../workflows/delivery-promise/utils/date-time-utils"
import { roundToTwoDecimals } from "../../../../shared/utils/calculate-discount-amount"
import { getPromotionRulesWithCache } from "../../../../shared/utils/promotion-cache"
import { formatPromotionDisplayText } from "../../../../shared/utils/validate-promotion-restrictions"
import {
  fetchStyleItWithCrossLinks,
  PdpCrossLink,
} from "../products/utils/pdp-sections"
import { refetchProduct } from "../products/helpers"


/**
 * Extract date string (YYYY-MM-DD) from a Date object
 * Server is already in IST, so extract directly
 */
function extractDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const refetchCart = async (
  id: string,
  scope: MedusaContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id } },
    fields,
  })

  const [cart] = await remoteQuery(queryObject)

  // Filter out soft-deleted adjustments from cart items
  // Medusa's query graph doesn't automatically filter deleted_at for nested relations
  if (cart && cart.items) {
    cart.items = cart.items.map((item: any) => {
      if (item.adjustments) {
        item.adjustments = item.adjustments.filter((adj: any) => !adj.deleted_at)
      }
      return item
    })
  }

  return cart
}

export const refetchCartWithDeliveryDetails = async (
  id: string,
  scope: MedusaContainer,
  fields: string[]
) => {
  const cart = await refetchCart(id, scope, fields)

  try {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: deliveryDetails } = await query.graph({
      entity: 'cart_delivery_detail',
      filters: { cart_id: id, deleted_at: { $eq: null } },
      fields: ['*']
    })

    // Filter out soft-deleted adjustments from cart items
    // This is redundant if refetchCart already does it, but ensures consistency
    if (cart && cart.items) {
      cart.items = cart.items.map((item: any) => {
        if (item.adjustments) {
          item.adjustments = item.adjustments.filter((adj: any) => !adj.deleted_at)
        }
        return item
      })
    }

    return {
      ...cart,
      delivery_details: deliveryDetails.length > 0 ? (() => {
        const deliveryDetail = deliveryDetails[0]

        if (!deliveryDetail.delivery_date) {
          return null
        }

        const now = new Date()
        const todayStr = extractDateString(now)

        // Extract date string from delivery_date (can be ISO string or YYYY-MM-DD)
        // Server is already in IST, so extract directly
        let deliveryDateStr: string
        if (typeof deliveryDetail.delivery_date === 'string') {
          // If it's already YYYY-MM-DD format, use it directly
          if (/^\d{4}-\d{2}-\d{2}$/.test(deliveryDetail.delivery_date)) {
            deliveryDateStr = deliveryDetail.delivery_date
          } else {
            // If it's ISO format, parse and extract date string directly
            deliveryDateStr = extractDateString(new Date(deliveryDetail.delivery_date))
          }
        } else {
          // If it's a Date object, extract date string directly
          deliveryDateStr = extractDateString(new Date(deliveryDetail.delivery_date))
        }

        // Reject if delivery date has passed
        if (deliveryDateStr < todayStr) {
          return null
        }

        // If delivery date is today, check if end time has passed
        if (deliveryDateStr === todayStr && deliveryDetail.end_time) {
          // Create datetime for the end time
          const endTime = createISTDateTime(deliveryDateStr, deliveryDetail.end_time)

          // Reject if end time has passed
          if (!isNaN(endTime.getTime()) && endTime <= now) {
            return null
          }
        }

        // Return delivery details with formatted date (YYYY-MM-DD)
        return {
          ...deliveryDetail,
          delivery_date: deliveryDateStr
        }
      })() : null
    }
  } catch (error) {
    console.error('Error fetching delivery details:', error)
    return {
      ...cart,
      delivery_details: null
    }
  }
}

type ServiceableVariant = { line_item_id: string };
type NonServiceableVariant = { line_item_id: string };
type OutOfStockItem = { line_item_id: string };
type PartiallyAvailableItem = {
  line_item_id: string;
  requested_quantity: number;
  available_quantity: number;
};

type DeliveryPromiseResult = {
  status: boolean;
  error?: string;
  serviceable_variants?: ServiceableVariant[];
  non_serviceable_variants?: NonServiceableVariant[];
  out_of_stock_items?: OutOfStockItem[];
  partially_available_items?: PartiallyAvailableItem[];
  instant_promise?: unknown;
  available_slots?: unknown;
  message?: string;
};

/**
 * Round all monetary values in cart to 2 decimal places
 * This fixes floating point precision issues like 999.9999999999999
 * Also recalculates cart totals from rounded line items to ensure consistency
 */
function roundCartMonetaryValues(cart: HttpTypes.StoreCart): void {
  // First, round all line item values
  if (cart.items && Array.isArray(cart.items)) {
    cart.items.forEach((item: any) => {
      const itemMonetaryFields = [
        'unit_price',
        'compare_at_unit_price',
        'subtotal',
        'total',
        'tax_total',
        'discount_total',
        'original_total',
      ]

      itemMonetaryFields.forEach(field => {
        if (item[field] != null && typeof item[field] === 'number') {
          item[field] = roundToTwoDecimals(item[field])
        }
      })

      // Round adjustment amounts
      if (item.adjustments && Array.isArray(item.adjustments)) {
        item.adjustments.forEach((adj: any) => {
          if (adj.amount != null && typeof adj.amount === 'number') {
            adj.amount = roundToTwoDecimals(adj.amount)
          }
        })
      }
    })
  }

  // Round shipping method totals
  if (cart.shipping_methods && Array.isArray(cart.shipping_methods)) {
    cart.shipping_methods.forEach((method: any) => {
      const shippingMonetaryFields = [
        'amount',
        'subtotal',
        'total',
        'tax_total',
        'original_total',
      ]

      shippingMonetaryFields.forEach(field => {
        if (method[field] != null && typeof method[field] === 'number') {
          method[field] = roundToTwoDecimals(method[field])
        }
      })

      // Round shipping adjustment amounts
      if (method.adjustments && Array.isArray(method.adjustments)) {
        method.adjustments.forEach((adj: any) => {
          if (adj.amount != null && typeof adj.amount === 'number') {
            adj.amount = roundToTwoDecimals(adj.amount)
          }
        })
      }
    })
  }

  // Recalculate cart totals from rounded line items to ensure consistency
  let recalculatedItemSubtotal = 0
  let recalculatedItemTotal = 0
  let recalculatedItemDiscountTotal = 0
  let recalculatedItemTaxTotal = 0
  let recalculatedOriginalItemTotal = 0
  let recalculatedOriginalItemSubtotal = 0

  if (cart.items && Array.isArray(cart.items)) {
    cart.items.forEach((item: any) => {
      recalculatedItemSubtotal += roundToTwoDecimals(item.subtotal || 0)
      recalculatedItemTotal += roundToTwoDecimals(item.total || 0)
      recalculatedItemDiscountTotal += roundToTwoDecimals(item.discount_total || 0)
      recalculatedItemTaxTotal += roundToTwoDecimals(item.tax_total || 0)
      recalculatedOriginalItemTotal += roundToTwoDecimals(item.original_total || 0)
      recalculatedOriginalItemSubtotal += roundToTwoDecimals(item.subtotal || 0) // original_item_subtotal same as subtotal
    })
  }

  // Round shipping totals
  let recalculatedShippingSubtotal = 0
  let recalculatedShippingTotal = 0
  let recalculatedShippingTaxTotal = 0
  let recalculatedOriginalShippingTotal = 0
  let recalculatedOriginalShippingSubtotal = 0

  if (cart.shipping_methods && Array.isArray(cart.shipping_methods)) {
    cart.shipping_methods.forEach((method: any) => {
      recalculatedShippingSubtotal += roundToTwoDecimals(method.subtotal || method.amount || 0)
      recalculatedShippingTotal += roundToTwoDecimals(method.total || method.amount || 0)
      recalculatedShippingTaxTotal += roundToTwoDecimals(method.tax_total || 0)
      recalculatedOriginalShippingTotal += roundToTwoDecimals(method.original_total || method.amount || 0)
      recalculatedOriginalShippingSubtotal += roundToTwoDecimals(method.subtotal || method.amount || 0)
    })
  }

  // Round extra charge amounts if they exist
  if ((cart as any).extra_charges && Array.isArray((cart as any).extra_charges)) {
    (cart as any).extra_charges.forEach((charge: any) => {
      if (charge.amount != null && typeof charge.amount === 'number') {
        charge.amount = roundToTwoDecimals(charge.amount)
      }
    })
  }

  // Round extra_charge_total before using it
  const extraChargeTotal = roundToTwoDecimals((cart as any).extra_charge_total || 0)
  ;(cart as any).extra_charge_total = extraChargeTotal

  // Update cart totals with recalculated values - ROUND THE FINAL SUMS
  cart.item_subtotal = roundToTwoDecimals(recalculatedItemSubtotal)
  cart.item_total = roundToTwoDecimals(recalculatedItemTotal)
  ;(cart as any).discount_subtotal = roundToTwoDecimals(recalculatedItemDiscountTotal) // discount_subtotal is sum of item discounts
  cart.discount_total = roundToTwoDecimals(recalculatedItemDiscountTotal) // discount_total same as discount_subtotal when no shipping discounts
  cart.item_tax_total = roundToTwoDecimals(recalculatedItemTaxTotal)
  cart.original_item_total = roundToTwoDecimals(recalculatedOriginalItemTotal)
  cart.original_item_subtotal = roundToTwoDecimals(recalculatedOriginalItemSubtotal)

  cart.shipping_subtotal = roundToTwoDecimals(recalculatedShippingSubtotal)
  cart.shipping_total = roundToTwoDecimals(recalculatedShippingTotal)
  cart.shipping_tax_total = roundToTwoDecimals(recalculatedShippingTaxTotal)
  cart.original_shipping_total = roundToTwoDecimals(recalculatedOriginalShippingTotal)
  cart.original_shipping_subtotal = roundToTwoDecimals(recalculatedOriginalShippingSubtotal)

  // Calculate subtotal (item_subtotal + shipping_subtotal)
  cart.subtotal = roundToTwoDecimals(recalculatedItemSubtotal + recalculatedShippingSubtotal)

  // Calculate total (item_total + shipping_total + extra_charges)
  cart.total = roundToTwoDecimals(recalculatedItemTotal + recalculatedShippingTotal + extraChargeTotal)

  // Round remaining cart-level totals that weren't recalculated
  const remainingMonetaryFields = [
    'tax_total',
    'discount_tax_total',
    'original_total',
    'original_tax_total',
    'original_item_tax_total',
    'original_shipping_tax_total',
    'credit_line_subtotal',
    'credit_line_tax_total',
    'credit_line_total',
  ]

  remainingMonetaryFields.forEach(field => {
    if (cart[field] != null && typeof cart[field] === 'number') {
      ;(cart as any)[field] = roundToTwoDecimals(cart[field] as number)
    }
  })
}

type DeliveryOption = {
  key: "standard" | "home_trial"
  eligible: boolean
}

function enrichCartWithSavingsMetrics(cart: HttpTypes.StoreCart): void {
  const items = Array.isArray(cart.items) ? cart.items : []

  // `transformCart()` already rounds cart monetary fields via `roundCartMonetaryValues()`.
  // So for this derived pricing, prefer "sum then round" to reduce rounding churn.
  //
  // MRP is sourced from `compare_at_unit_price` when present, otherwise `unit_price`.
  const totalMrpRaw = items.reduce((sum, item: any) => {
    const qty = typeof item?.quantity === "number" ? item.quantity : 0
    const mrpUnit =
      typeof item?.compare_at_unit_price === "number"
        ? item.compare_at_unit_price
        : typeof item?.unit_price === "number"
          ? item.unit_price
          : 0

    return sum + mrpUnit * qty
  }, 0)

  const totalMrp = roundToTwoDecimals(totalMrpRaw)

  // Discount on MRP excludes coupon/adjustment discount.
  const itemSubtotal = typeof cart.item_subtotal === "number" ? cart.item_subtotal : 0
  const discountOnMrpRaw = totalMrp - itemSubtotal
  const discountOnMrp = Math.max(0, roundToTwoDecimals(discountOnMrpRaw))

  // `cart.discount_total` is already the coupon/adjustment discount total.
  const couponDiscount = typeof cart.discount_total === "number" ? cart.discount_total : 0
  const totalSaving = roundToTwoDecimals(couponDiscount + discountOnMrp)

  ;(cart as any).total_mrp = totalMrp
  ;(cart as any).discount_on_mrp = discountOnMrp
  ;(cart as any).total_saving = totalSaving
}

const HOME_TRIAL_DISABLED_MESSAGE = "Due to this item home trial is disabled"

function getIsTryAndBuyFromItem(item: any): boolean {
  const cfg =
    item?.variant?.product?.product_configuration ??
    item?.product?.product_configuration ??
    null

  if (typeof cfg?.is_try_and_buy === "boolean") {
    return cfg.is_try_and_buy
  }

  // Fallback if we already store this flag on metadata (added in prepare-line-item-data)
  if (typeof item?.metadata?.is_try_and_buy === "boolean") {
    return item.metadata.is_try_and_buy
  }

  return false
}

export function enrichCartWithDeliveryOptions(cart: HttpTypes.StoreCart): HttpTypes.StoreCart {
  const items = Array.isArray(cart.items) ? cart.items : []
  const allItemsTryAndBuy =
    items.length > 0 ? items.every((i: any) => getIsTryAndBuyFromItem(i) === true) : false

  const delivery_options: DeliveryOption[] = [
    { key: "standard", eligible: true },
    { key: "home_trial", eligible: allItemsTryAndBuy },
  ]

    ; (cart as any).delivery_options = delivery_options

  // Check for delivery delay due to non-zilo seller items
  const ziloSellerId = process.env.ZILO_SELLER_ID
  const delayedItems: string[] = []

  items.forEach((item: any) => {
    // Check if item has a seller and it's not zilo seller
    if (item.seller?.id && item.seller.id !== ziloSellerId) {
      delayedItems.push(item.id)
    }
  })

    // Add delivery delay info to cart
    ; (cart as any).is_delivery_delayed = delayedItems.length > 0
    ; (cart as any).delayed_items = delayedItems

  // If cart is not eligible for home trial and delivery_details has type 'home_trial', clear it
  if (!allItemsTryAndBuy && (cart as any).delivery_details?.delivery_type === 'home_trial') {
    ; (cart as any).delivery_details = null
  }

  cart.items = items.map((item: any) => {
    const isTryAndBuy = getIsTryAndBuyFromItem(item)
    return {
      ...item,
      home_trial_message: isTryAndBuy ? null : HOME_TRIAL_DISABLED_MESSAGE,
    }
  })

  return cart
}

export const transformCart = (cart: HttpTypes.StoreCart & { deliveryPromiseResult?: DeliveryPromiseResult }): HttpTypes.StoreCart => {
  const dp = cart.deliveryPromiseResult ?? {} as DeliveryPromiseResult;

  // Round all monetary values first to fix floating point precision issues
  roundCartMonetaryValues(cart)
  enrichCartWithSavingsMetrics(cart)

  // Format delivery_date if delivery_details exists
  // Extract date string directly (server is already in IST)
  if ((cart as any).delivery_details?.delivery_date) {
    const deliveryDetail = (cart as any).delivery_details
    const deliveryDate = deliveryDetail.delivery_date

    // If delivery_date is a Date object or ISO string, extract date string directly
    if (deliveryDate instanceof Date || typeof deliveryDate === 'string') {
      const date = deliveryDate instanceof Date ? deliveryDate : new Date(deliveryDate)
      const deliveryDateStr = extractDateString(date)

        // Update delivery_details with formatted date
        ; (cart as any).delivery_details = {
          ...deliveryDetail,
          delivery_date: deliveryDateStr
        }
    }
  }

  // Safely handle arrays - ensure they are arrays before mapping
  const serviceableVariants = Array.isArray(dp.serviceable_variants) ? dp.serviceable_variants : [];
  const nonServiceableVariants = Array.isArray(dp.non_serviceable_variants) ? dp.non_serviceable_variants : [];
  const outOfStockItems = Array.isArray(dp.out_of_stock_items) ? dp.out_of_stock_items : [];
  const partiallyAvailableItems = Array.isArray(dp.partially_available_items) ? dp.partially_available_items : [];

  // Create lookup maps for quick access
  const serviceableMap = new Map(serviceableVariants.map(v => [v.line_item_id, true]));
  const nonServiceableMap = new Map(nonServiceableVariants.map(v => [v.line_item_id, true]));
  const outOfStockMap = new Map(outOfStockItems.map(v => [v.line_item_id, true]));
  const partialMap = new Map(partiallyAvailableItems.map(v => [v.line_item_id, v]));


  // Enrich items with flags, preserve all other info
  // Also filter out soft-deleted adjustments
  cart.items = (cart.items || []).map(item => {
    const partialInfo = partialMap.get(item.id);

    // Filter out soft-deleted adjustments
    if (item.adjustments) {
      item.adjustments = item.adjustments.filter((adj: any) => !adj.deleted_at)
    }

    // Determine is_serviceable:

    return {
      ...item,
      is_serviceable: (serviceableMap.size === 0 && nonServiceableMap.size === 0)
        ? false
        : (serviceableMap.has(item.id) && !nonServiceableMap.has(item.id)),
      is_out_of_stock: outOfStockMap.has(item.id),
      is_partially_available: Boolean(partialInfo),
      ...(partialInfo ? {
        requested_quantity: (partialInfo as PartiallyAvailableItem).requested_quantity,
        available_quantity: (partialInfo as PartiallyAvailableItem).available_quantity,
      } : {}),
    };
  });
  // console.log('cart.items',cart.items)
  // Sort items by created_at in ascending order (oldest first)
  if (cart?.items?.length > 0) {
    cart.items = Array.from(cart.items).map(item => ({
      ...item,
      created_at: item.created_at || new Date()
    })).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // Clean up deliveryPromiseResult
  if (cart.deliveryPromiseResult) {
    const {
      serviceable_variants,
      non_serviceable_variants,
      out_of_stock_items,
      partially_available_items,
      message,
      ...rest
    } = cart.deliveryPromiseResult;

    void serviceable_variants;
    void non_serviceable_variants;
    void out_of_stock_items;
    void partially_available_items;
    void message;

    cart.deliveryPromiseResult = { ...rest };
  }

  // Delivery options (cart-level) + home_trial_message (item-level)
  enrichCartWithDeliveryOptions(cart)

  return cart;
};



/**
 * Handle promotion warnings: Show removal messages only for actually removed promotions
 * - If promotion is applied (has adjustments) → Keep it in promotions array (normal behavior)
 * - If promotion was removed (no adjustments, but warning exists) → Show removal message in promotions array
 */
export async function enrichPromotionsWithWarnings(
  cart: HttpTypes.StoreCart,
  scope: MedusaContainer
): Promise<HttpTypes.StoreCart> {
  // Check if there are any promotion warnings in metadata
  const metadata = cart.metadata as any
  const promotionWarnings = metadata?.promotion_warnings || []


  if (!Array.isArray(promotionWarnings) || promotionWarnings.length === 0) {
    return cart
  }

  // Get actually applied promotion codes from cart items (adjustments)
  const appliedPromotionCodes = new Set<string>()
  const appliedPromotionIds = new Set<string>()

  if (cart.items && Array.isArray(cart.items)) {
    cart.items.forEach((item: any) => {
      if (item.adjustments && Array.isArray(item.adjustments)) {
        item.adjustments.forEach((adj: any) => {
          if (adj.code && !adj.deleted_at) {
            appliedPromotionCodes.add(adj.code.trim())
            if (adj.promotion_id) {
              appliedPromotionIds.add(adj.promotion_id)
            }
          }
        })
      }
    })
  }

  // Also check shipping method adjustments
  if (cart.shipping_methods && Array.isArray(cart.shipping_methods)) {
    cart.shipping_methods.forEach((method: any) => {
      if (method.adjustments && Array.isArray(method.adjustments)) {
        method.adjustments.forEach((adj: any) => {
          if (adj.code && !adj.deleted_at) {
            appliedPromotionCodes.add(adj.code.trim())
            if (adj.promotion_id) {
              appliedPromotionIds.add(adj.promotion_id)
            }
          }
        })
      }
    })
  }

  // Ensure applied promotions are in the promotions array
  // If promotion has adjustments but is missing from promotions array, fetch and add it
  if (appliedPromotionCodes.size > 0) {
    // Get existing promotion codes in the array
    const existingPromotionCodes = new Set<string>()
    if (cart.promotions && Array.isArray(cart.promotions)) {
      cart.promotions.forEach((promo: any) => {
        if (promo.code && !promo.is_removed) {
          existingPromotionCodes.add(promo.code.trim())
        }
      })
    }

    // Find missing applied promotions
    const missingPromotionCodes = Array.from(appliedPromotionCodes).filter(
      code => !existingPromotionCodes.has(code)
    )

    if (missingPromotionCodes.length > 0) {
      try {
        const promotionService = scope.resolve<IPromotionModuleService>(Modules.PROMOTION)

        const promotions = await promotionService.listPromotions(
          { code: missingPromotionCodes },
          {
            select: ["id", "code", "is_automatic", "is_tax_inclusive", "status"],
            relations: ["application_method"]
          }
        )

        // Add missing applied promotions to array
        if (promotions.length > 0) {
          if (!cart.promotions) {
            cart.promotions = []
          }

          const newPromotions = promotions.map((promo: any) => ({
            id: promo.id,
            code: promo.code,
            is_automatic: promo.is_automatic,
            is_tax_inclusive: promo.is_tax_inclusive,
            application_method: promo.application_method ? {
              value: promo.application_method.value,
              type: promo.application_method.type,
              currency_code: promo.application_method.currency_code
            } : undefined
          }))

          cart.promotions.push(...newPromotions)
        } 
      } catch (error) {
        console.error(`[ENRICH PROMOTIONS] Cart ${cart.id}: Error fetching applied promotions:`, error)
      }
    }
  }

  // Extract promotion codes from warning messages
  // Format: "Promotion zilo1k requires a minimum cart value of 3000. Current cart value is 1400"
  const removedPromotionCodes: Map<string, string> = new Map()

  promotionWarnings.forEach((warning: string) => {
    // Try to extract promotion code from warning message
    // Pattern: "Promotion <code> requires..." or "Promotion '<code>' requires..."
    const match = warning.match(/Promotion\s+['"]?(\w+)['"]?\s+requires/i)
    if (match && match[1]) {
      const code = match[1].trim()
      // Only track if this promotion is NOT actually applied (was removed)
      if (!appliedPromotionCodes.has(code)) {
        removedPromotionCodes.set(code, warning)
      }
    }
  })

  // If there are removed promotions, add removal messages to promotions array
  if (removedPromotionCodes.size > 0) {
    const removalPromotions = Array.from(removedPromotionCodes.entries()).map(([code, message]) => ({
      warning: message,
      code: code
    } as any))

    // Add removal messages to promotions array (don't include promotion details)
    if (!cart.promotions) {
      cart.promotions = []
    }

    // Remove any existing removal messages for these codes to avoid duplicates
    cart.promotions = cart.promotions.filter((promo: any) => {
      if (promo.is_removed) {
        return !removedPromotionCodes.has(promo.code?.trim())
      }
      return true
    })

    // Add new removal messages
    cart.promotions.push(...removalPromotions)
  }

  // Clean up metadata: remove promotion_warnings after showing removal message once
  // This ensures the message only appears once, not on every GET cart call
  if (metadata.promotion_warnings && removedPromotionCodes.size > 0) {
    delete metadata.promotion_warnings

    // Persist the metadata update to database so it doesn't show again
    try {
      const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      await knex('cart')
        .where('id', cart.id)
        .update({
          metadata: JSON.stringify(metadata),
          updated_at: new Date()
        })
    } catch (error) {
      console.error(`[ENRICH PROMOTIONS] Cart ${cart.id}: Error updating cart metadata:`, error)
      // Don't fail the request if metadata update fails
    }

    cart.metadata = metadata
  }

  return cart
}

/**
 * Enrich ONLY already-applied `cart.promotions` entries with `display_text`.
 *
 * `cart.promotions` from the Medusa cart graph typically does not include `promotion_extension`,
 * so we fetch promotion rules via cache and then run the shared formatter.
 */
export async function enrichAppliedCartPromotionsWithDisplayText(
  cart: HttpTypes.StoreCart,
  scope: MedusaContainer
): Promise<HttpTypes.StoreCart> {
  if (!cart?.promotions || !Array.isArray(cart.promotions) || cart.promotions.length === 0) {
    return cart
  }

  type CartPromotionForText = Record<string, unknown> & {
    code?: unknown
    display_text?: string | null
    is_hidden?: boolean
  }

  const promotions = cart.promotions as unknown as CartPromotionForText[]

  await Promise.all(
    promotions.map(async (promo) => {
      const code = typeof promo.code === "string" ? promo.code.trim() : null
      if (!code) return

      const rules = await getPromotionRulesWithCache(code, scope)
      if (!rules) return

      // Expose `is_hidden` on cart promotions for clients.
      promo.is_hidden = Boolean(rules.is_hidden)

      const promotionForText = {
        ...promo,
        promotion_extension: {
          custom_tagline: rules.custom_tagline ?? null,
          cart_sub_total: rules.cart_sub_total,
          promo_code_upper_limit: rules.promo_code_upper_limit,
        },
      } as unknown as Parameters<typeof formatPromotionDisplayText>[0]

      promo.display_text = formatPromotionDisplayText(promotionForText)
    })
  )

  return cart
}

/**
 * Build cart cross-links using PDP-style "Style it with" logic only.
 * Similar products links are returned on the PDP API only, not on cart responses.
 */
export async function buildCartCrossLinks(
  cart: HttpTypes.StoreCart,
  scope: MedusaContainer,
  options?: { relatedLimit?: number; preferredLineItemId?: string }
): Promise<PdpCrossLink[]> {
  const relatedLimit = options?.relatedLimit ?? 8
  const items = Array.isArray(cart?.items) ? cart.items : []

  if (items.length === 0) {
    return []
  }

  const preferredLineItem = options?.preferredLineItemId
    ? items.find((item: any) => item?.id === options.preferredLineItemId)
    : null

  // Build a deterministic "primary product" from cart:
  // prefer explicitly requested line item, else choose highest-priced line item.
  const highestPricedItem = items.reduce((highest: any, current: any) => {
    const highestValue =
      typeof highest?.total === "number"
        ? highest.total
        : typeof highest?.unit_price === "number"
          ? highest.unit_price * (highest?.quantity || 1)
          : 0

    const currentValue =
      typeof current?.total === "number"
        ? current.total
        : typeof current?.unit_price === "number"
          ? current.unit_price * (current?.quantity || 1)
          : 0

    return currentValue > highestValue ? current : highest
  }, items[0] as any)

  const sourceItem = preferredLineItem ?? highestPricedItem

  const productId =
    sourceItem?.product?.id ??
    sourceItem?.variant?.product?.id ??
    sourceItem?.product_id ??
    sourceItem?.variant?.product_id

  if (!productId) {
    return []
  }

  const selectedProduct = await refetchProduct(
    productId,
    scope,
    [
      "id",
      "categories.name",
      "categories.attributes.name",
      "categories.attributes.value",
      "attribute_values.name",
      "attribute_values.value",
      "attribute_values.attribute.name",
      "metadata",
    ]
  )
  if (!selectedProduct) {
    return []
  }

  const { crossLinks } = await fetchStyleItWithCrossLinks(selectedProduct, {
    relatedLimit,
  })
  if (!Array.isArray(crossLinks) || crossLinks.length === 0) {
    return []
  }

  return crossLinks
}
