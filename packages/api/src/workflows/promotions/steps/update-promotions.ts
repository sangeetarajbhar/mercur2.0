import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PromotionModuleService from "../../../modules/promotion_extension/service"
import { PROMOTION_MODULE } from "../../../modules/promotion_extension"

type UpdatePromotionStepInput = {
  id: string
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

export const updatePromotionStep = createStep(
  "update-promotion",
  async (data: UpdatePromotionStepInput, { container }) => {
    // Log to help debugging
    if (
      typeof data.custom_tagline === "string" &&
      data.custom_tagline.length > 50
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "custom_tagline must be 50 characters or fewer"
      )
    }

    const promotionModuleService: PromotionModuleService = container.resolve(
      PROMOTION_MODULE
    )

    const { id, ...updateData } = data
    const custom = await promotionModuleService.updateCustoms(id, updateData)


    return new StepResponse(custom, { id, previousData: custom })
  },
  async (revertData, { container }) => {
    if (!revertData) return
    
    const promotionModuleService: PromotionModuleService = container.resolve(
      PROMOTION_MODULE
    )

    // Revert to previous data if needed
    await promotionModuleService.updateCustoms(revertData.id, revertData.previousData)
  }
)


