import { CreateMoneyAmountDTO } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

export const ensureVariantPriceSetsStep = createStep(
  "ensure-variant-price-sets",
  async (
    { variantPrices }: { 
      variantPrices: { 
        variant_id: string
        product_id: string
        prices?: CreateMoneyAmountDTO[] 
      }[] 
    },
    { container }
  ) => {
    if (!variantPrices || variantPrices.length === 0) {
      return new StepResponse({ variantPrices })
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const pricingService = container.resolve(Modules.PRICING)
    const link = container.resolve("link")

    // Get variants that have prices
    const variantsWithPrices = variantPrices.filter(
      (vp) => vp.prices && vp.prices.length > 0
    )

    if (variantsWithPrices.length === 0) {
      return new StepResponse({ variantPrices })
    }

    const variantIds = variantsWithPrices.map((vp) => vp.variant_id)

    // Check which variants already have price sets
    const { data: existingLinks } = await query.graph({
      entity: "product_variant_price_set",
      fields: ["variant_id", "price_set_id"],
      filters: {
        variant_id: variantIds,
      },
    })

    const variantIdToPriceSetId = new Map<string, string>()
    if (existingLinks) {
      existingLinks.forEach((link: { variant_id: string; price_set_id: string }) => {
        variantIdToPriceSetId.set(link.variant_id, link.price_set_id)
      })
    }

    // Find variants without price sets
    const variantsWithoutPriceSets = variantsWithPrices.filter(
      (vp) => !variantIdToPriceSetId.has(vp.variant_id)
    )

    if (variantsWithoutPriceSets.length > 0) {
      for (const variantWithoutPriceSet of variantsWithoutPriceSets) {
        const createdPriceSet = await pricingService.createPriceSets({
          prices: [],
        })

        await link.create({
          [Modules.PRODUCT]: {
            variant_id: variantWithoutPriceSet.variant_id,
          },
          [Modules.PRICING]: {
            price_set_id: createdPriceSet.id,
          },
        })
      }
    }

    return new StepResponse({ variantPrices })
  }
)

