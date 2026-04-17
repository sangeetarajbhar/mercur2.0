import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { EXTEND_PRICE_MODULE } from "../../../modules/pricing-extend"

export const createExtendPriceLinkStepId = "create-extend-price-links"

export const validatePercentExtendPriceLinkStep = createStep(
  createExtendPriceLinkStepId,
  async (
    data: { pricesWithDiscount: { price_id: string; percentage_discount?: number }[] },
    { container }
  ) => {
    const extendPriceService: any = container.resolve(EXTEND_PRICE_MODULE)

    const toLink: {
      price_id: string
      extend_price_id: string
    }[] = []

    for (const entry of data.pricesWithDiscount) {
      if (entry.percentage_discount == null) continue

      const extendPrice = await extendPriceService.createExtendPrices({
        percentage_discount: entry.percentage_discount,
      })

      toLink.push({
        price_id: entry.price_id,
        extend_price_id: extendPrice.id,
      })
    }

    return new StepResponse(toLink)
  }
)
