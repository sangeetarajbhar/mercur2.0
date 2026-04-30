import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError, ContainerRegistrationKeys, PromotionActions, Modules } from "@medusajs/framework/utils"
import { ICartModuleService } from "@medusajs/framework/types"
import { updateCartPromotionsWorkflow } from "../../../../../workflows/cart/workflows/update-cart-promotions"
import { HttpTypes } from "@medusajs/framework/types"
import { refetchCart } from '../../../v2/carts/helpers'
import { getPromotionRulesWithCache } from '../../../../../shared/utils/promotion-cache'
import { validateCartPromotions } from './validate-promotions'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const body = req.body as { promo_codes?: string[] }
  const promo_codes = body.promo_codes?.map(code => code.trim()) || []

  try {
    // Run all validations
    const validation = await validateCartPromotions(req, id, promo_codes)
    if (!validation.isValid && validation.error) {
      return res.status(validation.error.status).json(validation.error.body)
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const cartModuleService = req.scope.resolve(Modules.CART) as ICartModuleService

    // STEP: Before applying, remove from rejected list (if manually applied)
    // This allows users to re-apply previously rejected auto promos
    const { data: [cartForMetadata] } = await query.graph({
      entity: 'cart',
      fields: ['id', 'metadata'],
      filters: { id }
    })

    if (cartForMetadata?.metadata) {
      let metadata = cartForMetadata.metadata
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata)
        } catch {
          metadata = {}
        }
      }

      const rejectedCodes = (metadata as any).rejected_auto_promo_codes || []

      // Remove applied codes from rejected list (user explicitly wants them)
      const updatedRejectedCodes = rejectedCodes.filter(
        (code: string) => !promo_codes.includes(code)
      )

      // Only update if something changed
      if (updatedRejectedCodes.length !== rejectedCodes.length) {
        await cartModuleService.updateCarts(
          { id },
          {
            metadata: {
              ...metadata,
              rejected_auto_promo_codes: updatedRejectedCodes
            }
          }
        )
      }
    }

    const newCode = promo_codes[0]
    const newCodeRules = await getPromotionRulesWithCache(newCode, req.scope)

    let action = PromotionActions.ADD

    // If new code has override_existing = true, always REPLACE
    if (newCodeRules?.override_existing === true) {
      action = PromotionActions.REPLACE
    } else {
      // New code has override_existing = false
      // Check if cart has any existing codes with override_existing = true
      // If yes, REPLACE (remove override codes, apply new code)
      // If no, ADD (stack)
      const { data: [cartWithPromos] } = await query.graph({
        entity: 'cart',
        fields: ['id', 'promotions.code'],
        filters: { id }
      })

      if (cartWithPromos?.promotions?.length && cartWithPromos.promotions.length > 0) {
        // Check each existing promotion's override_existing flag
        for (const existingPromo of cartWithPromos.promotions) {
          if (existingPromo?.code) {
            const existingRules = await getPromotionRulesWithCache(existingPromo.code, req.scope)
            if (existingRules?.override_existing === true) {
              action = PromotionActions.REPLACE
              break
            }
          }
        }
      }
    }

    await updateCartPromotionsWorkflow(req.scope).run({
      input: {
        cart_id: id,
        promo_codes,
        action,
        force_refresh_payment_collection: true,
      }
    })

    const cart = await refetchCart(
      req.params.id,
      req.scope,
      req.queryConfig.fields
    )

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
        error: "not_found",
        attempted_codes: promo_codes
      })
    }

    res.status(200).json({
      success: true,
      cart
    })
  } catch (error: unknown) {
    // Handle MedusaError instances (validation errors, etc.)
    const medusaErr =
      error instanceof MedusaError
        ? error
        : (error as any)?.cause instanceof MedusaError
          ? (error as any).cause
          : null

    if (medusaErr) {
      const statusCode = medusaErr.type === MedusaError.Types.NOT_FOUND ? 404 :
                        medusaErr.type === MedusaError.Types.INVALID_DATA ? 400 :
                        medusaErr.type === MedusaError.Types.NOT_ALLOWED ? 403 : 400

      return res.status(statusCode).json({
        success: false,
        message: medusaErr.message,
        error: medusaErr.code || medusaErr.type,
        attempted_codes: promo_codes
      })
    }

    // Handle workflow execution errors that might wrap MedusaError
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message

      // Check for tier-related errors
      if (errorMessage.includes('tier') || errorMessage.includes('Tier')) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          error: "tier_promotion_error",
          attempted_codes: promo_codes
        })
      }

      // Check for common promotion validation errors
      if (errorMessage.includes('not found') || errorMessage.includes('Promotion code')) {
        return res.status(404).json({
          success: false,
          message: errorMessage.includes('not found')
            ? `Sorry, this coupon code is invalid`
            : errorMessage,
          error: "promotion_not_found",
          attempted_codes: promo_codes
        })
      }

      if (errorMessage.includes('cannot be applied') ||
          errorMessage.includes('No eligible items') ||
          errorMessage.includes('minimum cart value') ||
          errorMessage.includes('first-time customers') ||
          errorMessage.includes('first customer')) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          error: "promotion_invalid",
          attempted_codes: promo_codes
        })
      }

      if (errorMessage.includes('campaign') || errorMessage.includes('budget')) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          error: "campaign_error",
          attempted_codes: promo_codes
        })
      }

      // Log unexpected errors for debugging
      console.error('[PROMOTION] Unexpected error applying promotion:', errorMessage, error)
    }

    // Generic server error for unexpected issues
    return res.status(500).json({
      success: false,
      message: "An error occurred while applying the promotion code. Please try again.",
      error: "internal_error",
      attempted_codes: promo_codes
    })
  }
}

export const DELETE = async (
  req: MedusaRequest<HttpTypes.StoreCartRemovePromotion>,
  res: MedusaResponse
) => {
  const payload = req.validatedBody
  const trimmedPromoCodes = payload.promo_codes?.map(code => code.trim()) || []

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const cartModuleService = req.scope.resolve(Modules.CART) as ICartModuleService

    // STEP 1: Check which removed codes are automatic
    const { data: promotions } = await query.graph({
      entity: 'promotion',
      fields: ['id', 'code', 'is_automatic'],
      filters: { code: trimmedPromoCodes }
    })

    const removedAutoPromoCodes = promotions
      .filter(p => p.is_automatic)
      .map(p => p.code)
      .filter(Boolean)

    // STEP 2: Remove promotions via workflow
    await updateCartPromotionsWorkflow(req.scope).run({
      input: {
        promo_codes: trimmedPromoCodes,
        cart_id: req.params.id,
        action: PromotionActions.REMOVE,
      },
    })

    // STEP 3: If any auto promos were removed, add them to rejected list
    if (removedAutoPromoCodes.length > 0) {
      // Get current cart metadata
      const { data: [cartForRejection] } = await query.graph({
        entity: 'cart',
        fields: ['id', 'metadata'],
        filters: { id: req.params.id }
      })

      if (cartForRejection) {
        // Parse existing metadata
        let metadata = cartForRejection.metadata || {}
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata)
          } catch {
            metadata = {}
          }
        }

        // Get existing rejected codes
        const existingRejectedCodes: string[] =
          (metadata as any).rejected_auto_promo_codes || []

        // Add new rejected codes (avoid duplicates)
        const updatedRejectedCodes = [
          ...new Set([
            ...existingRejectedCodes,
            ...removedAutoPromoCodes
          ])
        ]

        // Update cart metadata
        await cartModuleService.updateCarts(
          { id: req.params.id },
          {
            metadata: {
              ...metadata,
              rejected_auto_promo_codes: updatedRejectedCodes
            }
          }
        )
      }
    }

    // STEP 4: Refetch and return cart
    const cart = await refetchCart(
      req.params.id,
      req.scope,
      req.queryConfig.fields
    )

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
        error: "not_found",
        attempted_codes: trimmedPromoCodes
      })
    }

    res.status(200).json({
      success: true,
      cart
    })
  } catch (error: unknown) {
    // Handle MedusaError instances
    if (error instanceof MedusaError) {
      const statusCode = error.type === MedusaError.Types.NOT_FOUND ? 404 :
                        error.type === MedusaError.Types.INVALID_DATA ? 400 :
                        error.type === MedusaError.Types.NOT_ALLOWED ? 403 : 400

      return res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.code || error.type,
        attempted_codes: trimmedPromoCodes
      })
    }

    // Generic server error
    return res.status(500).json({
      success: false,
      message: "An error occurred while removing the promotion code. Please try again.",
      error: "internal_error",
      attempted_codes: trimmedPromoCodes
    })
  }
}
