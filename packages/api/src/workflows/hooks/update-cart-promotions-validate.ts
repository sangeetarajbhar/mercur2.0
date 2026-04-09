import { updateCartPromotionsWorkflow } from "../cart/workflows/update-cart-promotions"
import { MedusaError } from "@medusajs/framework/utils"
import { PromotionActions } from "@medusajs/framework/utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

updateCartPromotionsWorkflow.hooks.validate(
  async ({ input, cart }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Only validate when adding promotions
    if (
      (input.action !== PromotionActions.ADD &&
        input.action !== PromotionActions.REPLACE) ||
      !input.promo_codes ||
      input.promo_codes.length === 0
    ) {
      return
    }

    if (input.silent_remove) {
      return
    }


    try {
      // Get promotions by codes to check if they're tier promotions
      const { data: promotions } = await query.graph({
        entity: "promotion",
        fields: ["id", "code", "is_automatic"],
        filters: {
          code: input.promo_codes,
        },
      })

      if (!promotions || promotions.length === 0) {
        // No promotions found - let the workflow handle this error
        return
      }

      // SKIP tier validation for automatic promotions
      // Automatic promos are applied by the system (auto-discovery, tier hooks)
      // and do not need tier membership validation here.
      // Manual promo codes are validated at the API route level.
      // Checkout is protected by validateCartTierPromotionsStep.
      const manualPromotions = promotions.filter((p: any) => !p.is_automatic)
      if (manualPromotions.length === 0) {
        return
      }

      // Get customer's tier (only needed for manual promotion validation)
      const customerData = cart.customer_id
        ? await query.graph({
            entity: "customer",
            fields: ["id", "tier.id", "tier.promo_id"],
            filters: {
              id: cart.customer_id,
            },
          })
        : null

      const customerTier = customerData?.data?.[0]?.tier

      // Get all tiers with their promotion IDs (only for manual promos)
      const manualPromotionIds = manualPromotions.map((p: any) => p.id).filter(Boolean)

      if (manualPromotionIds.length === 0) {
        return
      }

      const { data: allTiers } = await query.graph({
        entity: "tier",
        fields: ["id", "promo_id"],
        filters: {
          promo_id: manualPromotionIds,
        },
      })

      // Validate each manually applied promotion
      for (const promotion of manualPromotions) {
        if (!promotion?.id) {
          continue
        }

        const tier = allTiers.find((t: any) => t.promo_id === promotion.id)

        // If this promotion belongs to a tier
        if (tier) {
          // Allow if customer is in the same tier
          if (customerTier?.id === tier.id) {
            continue // Customer is in the correct tier, allow
          }

          // Block if customer is in a different tier or has no tier
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Promotion ${promotion.code || promotion.id} can only be applied by customers in the corresponding tier. This promotion is associated with a tier that you are not currently in.`
          )
        }
      }
    } catch (error) {
      // Re-throw MedusaError as-is
      if (error instanceof MedusaError) {
        throw error
      }
      // For other errors, log and re-throw as a generic error
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `An error occurred while validating the promotion code. Please try again.`
      )
    }
  }
)


