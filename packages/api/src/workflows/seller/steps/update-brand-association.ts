import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { BRAND_MODULE } from "../../../modules/brand"
const SELLER_MODULE = "seller"

import SellerBrandLink from "../../../links/seller-brand"

/** Resolve brand id from a seller–brand link graph row (shape varies by Medusa version). */
function linkBrandIdFromGraphRow(l: any): string | undefined {
  return l?.brand?.id || l?.brand_id || l?.[BRAND_MODULE]?.brand_id || l?.[BRAND_MODULE]?.id
}

type UpdateSellerBrandAssociationsInput = {
  sellerId: string
  brand_associations?: {
    update?: { brand_id: string }[]
    delete?: string[]
  }
}

export const updateSellerBrandAssociationsStep = createStep(
  "update-seller-brand-associations",
  async (input: UpdateSellerBrandAssociationsInput, { container }) => {
    const link = container.resolve("link")
    const query = container.resolve("query")

    const { data: currentLinks } = await query.graph({
      entity: SellerBrandLink.entryPoint,
      fields: ["*", "brand.*"],
      filters: { seller_id: input.sellerId },
    })

    const currentBrandIds = currentLinks.map(linkBrandIdFromGraphRow).filter(Boolean)

    const brandsRequested = (input.brand_associations?.update || [])
      .map((b: any) => b?.brand_id)
      .filter(Boolean)
    const brandsToAdd = brandsRequested.filter(
      (brand_id: string) => !currentBrandIds.includes(brand_id)
    )
    const brandIdsToRemove = (input.brand_associations?.delete || []).filter(Boolean)

    const linksToCreate = brandsToAdd.map((brand_id: string) => ({
      [SELLER_MODULE]: { seller_id: input.sellerId },
      [BRAND_MODULE]: { brand_id },
    }))

    const linksToDismiss = brandIdsToRemove.map((brand_id: string) => ({
      [SELLER_MODULE]: { seller_id: input.sellerId },
      [BRAND_MODULE]: { brand_id },
    }))

    if (linksToDismiss.length) {
      await link.dismiss(linksToDismiss)
    }
    if (linksToCreate.length) {
      await link.create(linksToCreate)
    }

    return new StepResponse(
      {
        added: brandsToAdd,
        removed: brandIdsToRemove,
        created: brandsToAdd,
        deleted: brandIdsToRemove,
      },
      { previous: currentBrandIds, sellerId: input.sellerId }
    )
  },
  async (compensationInput: any, { container }) => {
    if (!compensationInput) return
    const { previous, sellerId } = compensationInput
    const link = container.resolve("link")
    const query = container.resolve("query")

    const { data: currentLinks } = await query.graph({
      entity: SellerBrandLink.entryPoint,
      fields: ["*", "brand.*"],
      filters: { seller_id: sellerId },
    })

    if (currentLinks.length > 0) {
      const linksToDismiss = currentLinks
        .map((l: any) => ({
          [SELLER_MODULE]: { seller_id: sellerId },
          [BRAND_MODULE]: { brand_id: linkBrandIdFromGraphRow(l) },
        }))
        .filter((l: any) => l[BRAND_MODULE]?.brand_id)

      if (linksToDismiss.length > 0) {
        await link.dismiss(linksToDismiss)
      }
    }

    if (previous?.length) {
      const previousLinks = previous.map((brand_id: string) => ({
        [SELLER_MODULE]: { seller_id: sellerId },
        [BRAND_MODULE]: { brand_id },
      }))
      await link.create(previousLinks)
    }
  }
)

