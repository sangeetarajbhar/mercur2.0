import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PromotionModuleService from "../../../modules/promotion_extension/service"
import { PROMOTION_MODULE } from "../../../modules/promotion_extension"

type CreatePromotionStepInput = {
  custom_tagline?: string | null
  terms_and_conditions?: string[]
  cart_sub_total?: number
  promo_code_upper_limit?: number
  seller_ids?: string[]
  first_customer?: boolean
  for_seller?: boolean
  is_hidden?: boolean
  override_existing?: boolean
  applicable_on?: 'all' | 'app' | 'web'
}

export const createPromotionStep = createStep(
  "create-promotion",
  async (data: CreatePromotionStepInput, { container }) => {
    if (
      typeof data.custom_tagline === "string" &&
      data.custom_tagline.length > 50
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "custom_tagline must be 50 characters or fewer"
      )
    }

    // If no data is provided and for_seller/is_hidden/applicable_on is not set, skip creation
    // Note: override_existing and applicable_on are always provided (defaults to true and 'all'), so we always create extension
    if (!data.cart_sub_total && !data.promo_code_upper_limit && !data.for_seller && !data.is_hidden && !data.first_customer && data.override_existing === undefined && data.applicable_on === undefined) {
      return
    }
    


    const promotionModuleService: PromotionModuleService = container.resolve(
      PROMOTION_MODULE
    )

    const custom = await promotionModuleService.createCustoms(data)

    return new StepResponse(custom, custom)
  },
  async (custom, { container }) => {
    if (!custom?.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Promotion custom ID is required for compensation'
      )
    }

    const promotionModuleService: PromotionModuleService = container.resolve(
      PROMOTION_MODULE
    )

    await promotionModuleService.softDeleteCustoms(custom.id)
  }
)

