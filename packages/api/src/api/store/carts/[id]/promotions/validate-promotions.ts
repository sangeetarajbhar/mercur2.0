import { MedusaRequest} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getAgentType } from "../../../../../shared/utils/get-agent-type"
import promotionExtensionLink from "../../../../../links/promotion-custom"

export interface ValidationResult {
  isValid: boolean
  error?: {
    status: number
    body: {
      success: false
      message: string
      error: string
      attempted_codes: string[]
    }
  }
}

/**
 * Validate that all provided promo codes exist.
 */
export async function validatePromotionCodesExist(
  promo_codes: string[],
  query: any
): Promise<ValidationResult> {
  if (!promo_codes || promo_codes.length === 0) {
    return { isValid: true }
  }

  const normalizedCodes = promo_codes.map((c) => (c ?? "").trim()).filter(Boolean)
  if (normalizedCodes.length === 0) {
    return { isValid: true }
  }

  const { data: promotions } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
    filters: { code: normalizedCodes },
  })

  const foundCodes = new Set(
    (promotions || [])
      .map((p: any) => (p?.code ?? "").trim())
      .filter(Boolean)
  )

  const missingCodes = normalizedCodes.filter((c) => !foundCodes.has(c))
  if (missingCodes.length > 0) {
    return {
      isValid: false,
      error: {
        status: 404,
        body: {
          success: false,
          message: "Coupon code is invalid",
          error: "promotion_not_found",
          attempted_codes: promo_codes,
        },
      },
    }
  }

  return { isValid: true }
}

/**
 * Validate that promo codes are provided
 */
export function validatePromoCodesProvided(
  promo_codes: string[]
): ValidationResult {
  if (!promo_codes || promo_codes.length === 0) {
    return {
      isValid: false,
      error: {
        status: 400,
        body: {
          success: false,
          message: "Promotion code is required",
          error: "missing_promo_code",
          attempted_codes: []
        }
      }
    }
  }
  return { isValid: true }
}

/**
 * Validate that promotions belong to the customer's tier
 */
export async function validateTierRestrictions(
  cartId: string,
  promo_codes: string[],
  query: any
): Promise<ValidationResult> {
  // Get customer tier from cart
  const { data: [cartWithCustomer] } = await query.graph({
    entity: 'cart',
    fields: ['id', 'customer.id', 'customer.tier.id', 'customer.tier.name'],
    filters: { id: cartId }
  })

  const customerTier = cartWithCustomer?.customer?.tier

  if (!customerTier?.id) {
    // No tier restriction - validation passes
    return { isValid: true }
  }

  // Get the promotions being applied
  const { data: promotionsToApply } = await query.graph({
    entity: 'promotion',
    fields: ['id', 'code'],
    filters: { code: promo_codes }
  })

  const promotionIds = promotionsToApply.map((p: any) => p.id).filter(Boolean)

  if (promotionIds.length === 0) {
    return { isValid: true }
  }

  // Find tiers that own these promotions
  const { data: tierPromotions } = await query.graph({
    entity: 'tier',
    fields: ['id', 'name', 'promo_id'],
    filters: { promo_id: promotionIds }
  })

  // Validate each promotion
  for (const promotion of promotionsToApply) {
    const tierPromo = tierPromotions.find((tp: any) => tp.promo_id === promotion.id)
    
    // If promotion belongs to a tier and it's not the customer's tier, reject
    if (tierPromo && tierPromo.id !== customerTier.id) {
      return {
        isValid: false,
        error: {
          status: 403,
          body: {
            success: false,
            message: `This coupon code is invalid. Please check the code and try again.`,
            error: "tier_promotion_mismatch",
            attempted_codes: promo_codes
          }
        }
      }
    }
  }

  return { isValid: true }
}

/**
 * Validate device restrictions (app/web/all)
 */
export async function validateDeviceRestrictions(
  req: MedusaRequest,
  promo_codes: string[],
  query: any
): Promise<ValidationResult> {
  const agentType = getAgentType(req)

  for (const promoCode of promo_codes) {
    const { data: promoForDevice } = await query.graph({
      entity: 'promotion',
      fields: ['id', 'code'],
      filters: { code: [promoCode] }
    })

    if (promoForDevice?.length > 0) {
      const promoId = promoForDevice[0].id

      const { data: extLinks } = await query.graph({
        entity: promotionExtensionLink.entryPoint,
        fields: ['promotion_extension.applicable_on'],
        filters: { promotion_id: promoId }
      })

      const applicableOn: string = extLinks?.[0]?.promotion_extension?.applicable_on ?? 'all'

      if (applicableOn !== 'all' && applicableOn !== agentType) {
        const deviceLabel = applicableOn === 'app' ? 'mobile app' : 'website'
        return {
          isValid: false,
          error: {
            status: 403,
            body: {
              success: false,
              message: `This coupon is only available on the ${deviceLabel}. Please use the ${deviceLabel} to apply it.`,
              error: "device_restriction",
              attempted_codes: promo_codes
            }
          }
        }
      }
    }
  }

  return { isValid: true }
}

/**
 * Run all validations for applying promotions to cart
 */
export async function validateCartPromotions(
  req: MedusaRequest,
  cartId: string,
  promo_codes: string[]
): Promise<ValidationResult> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // 1. Validate promo codes are provided
  const codesValidation = validatePromoCodesProvided(promo_codes)
  if (!codesValidation.isValid) {
    return codesValidation
  }

  // 2. Validate promo codes exist
  const existsValidation = await validatePromotionCodesExist(promo_codes, query)
  if (!existsValidation.isValid) {
    return existsValidation
  }

  // 3. Validate tier restrictions
  const tierValidation = await validateTierRestrictions(cartId, promo_codes, query)
  if (!tierValidation.isValid) {
    return tierValidation
  }

  // 4. Validate device restrictions
  const deviceValidation = await validateDeviceRestrictions(req, promo_codes, query)
  if (!deviceValidation.isValid) {
    return deviceValidation
  }

  return { isValid: true }
}