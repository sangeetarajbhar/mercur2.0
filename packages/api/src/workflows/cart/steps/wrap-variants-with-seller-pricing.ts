import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { wrapVariantsWithSellerPricing } from "../../../api/utils/middlewares"

export type ExtraData = {
  seller_id?: string
  location_ids?: string[]
  filterToSingleSeller?: boolean
}

export type WrapVariantsWithSellerPricingStepInput = {
  variants: any[]
  priceContext: any
  extraData?: ExtraData
}

export const wrapVariantsWithSellerPricingStep = createStep(
  "wrap-variants-with-seller-pricing",
  async (
    { priceContext, variants, extraData }: WrapVariantsWithSellerPricingStepInput,
    { container }
  ) => {
    try {
      const result = await wrapVariantsWithSellerPricing(container, variants, priceContext, extraData)

      return new StepResponse(result)
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to get variant pricing by seller: ${error.message}`
      )
    }
  }
)