import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SELLER_MODULE } from '../../../modules/seller'
import { BRAND_MODULE } from '../../../modules/brand'
import SellerBrandLink from "../../../links/seller-brand"

type UpdateSellerBrandAssociationsInput = {
  sellerId: string
  brand_associations?: {
    update?: { brand_id: string }[]  // Brands to add/map
    delete?: string[]                  // Brand IDs to unmap/remove
  }
}

export const updateSellerBrandAssociationsStep = createStep(
  "update-seller-brand-associations",
  async (input: UpdateSellerBrandAssociationsInput, { container }) => {
    const link = container.resolve("link")

    // Get update and delete arrays
    const brandsToAdd = (input.brand_associations?.update || []).map((b) => b?.brand_id).filter(Boolean)
    const brandIdsToRemove = (input.brand_associations?.delete || []).filter(Boolean)

    // Retrieve current brand associations for compensation/rollback
    const query = container.resolve("query")
    const { data: currentLinks } = await query.graph({
      entity: SellerBrandLink.entryPoint,
      fields: ["*", "brand.*"],
      filters: {
        seller_id: input.sellerId,
      },
    })

    const currentBrandIds = currentLinks.map((l) => l[BRAND_MODULE]?.brand_id).filter(Boolean)

    // Prepare links to create (for brands to add)
    const linksToCreate = brandsToAdd.map((brand_id) => ({
      [SELLER_MODULE]: { seller_id: input.sellerId },
      [BRAND_MODULE]: { brand_id },
    }))

    // Prepare links to dismiss (for brands to remove)
    const linksToDismiss = brandIdsToRemove.map((brand_id) => ({
      [SELLER_MODULE]: { seller_id: input.sellerId },
      [BRAND_MODULE]: { brand_id },
    }))

    // Execute batched operations
    if (linksToDismiss.length) {
      await link.dismiss(linksToDismiss)
    }
    if (linksToCreate.length) {
      await link.create(linksToCreate)
    }

    // Return result with added and removed brand IDs
    return new StepResponse(
      { 
        added: brandsToAdd, 
        removed: brandIdsToRemove,
        created: brandsToAdd,
        deleted: brandIdsToRemove
      },
      { previous: currentBrandIds, sellerId: input.sellerId }
    )
  },
  // Compensation: revert to previous associations if needed
  async (compensationInput, { container }) => {
    if (!compensationInput) return
    const { previous, sellerId } = compensationInput
    const link = container.resolve("link")
    
    // Get current links to remove them
    const query = container.resolve("query")
    const { data: currentLinks } = await query.graph({
      entity: SellerBrandLink.entryPoint,
      fields: ["*"],
      filters: {
        seller_id: sellerId,
      },
    })

    // Remove all current links
    if (currentLinks.length > 0) {
      const linksToDismiss = currentLinks.map((link) => ({
        [SELLER_MODULE]: { seller_id: sellerId },
        [BRAND_MODULE]: { brand_id: link[BRAND_MODULE]?.brand_id },
      })).filter(l => l[BRAND_MODULE]?.brand_id)
      
      if (linksToDismiss.length > 0) {
        await link.dismiss(linksToDismiss)
      }
    }
    
    // Restore previous links
     if (previous?.length) {
      const previousLinks = previous.map((brand_id) => ({
        [SELLER_MODULE]: { seller_id: sellerId },
        [BRAND_MODULE]: { brand_id },
      }))
      await link.create(previousLinks)
    }
  }
)