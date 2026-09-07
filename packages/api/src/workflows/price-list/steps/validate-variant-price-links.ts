import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

export type ValidateVariantPriceLinksStepInput = {
  prices?: {
    variant_id: string
  }[]
}[]

export const validateVariantPriceLinksStepId =
  "custom-validate-variant-price-links"

export const validateVariantPriceLinksStep = createStep(
  validateVariantPriceLinksStepId,
  async (data: ValidateVariantPriceLinksStepInput, { container }) => {
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    if (!data.length) {
      return new StepResponse(void 0)
    }

    const variantIds: string[] = data
      .map((pl) => pl?.prices?.map((price) => price?.variant_id) || [])
      .flat(1)
      .filter(
        (id): id is string => Boolean(id) && typeof id === "string" && id.trim() !== ""
      )

    const links = await remoteQuery({
      entryPoint: "product_variant_price_set",
      fields: ["variant_id", "price_set_id"],
      variables: { variant_id: variantIds },
    })
    const variantPriceSetMap: Record<string, string> = {}
    for (const link of links) {
      variantPriceSetMap[link.variant_id] = link.price_set_id
    }

    const withoutLinks = variantIds.filter((id) => !variantPriceSetMap[id])
    if (withoutLinks.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No price set exist for variants: ${withoutLinks.join(", ")}`
      )
    }

    return new StepResponse(variantPriceSetMap)
  }
)
