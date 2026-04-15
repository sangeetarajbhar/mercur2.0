import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Modules } from "@medusajs/framework/utils"

export const assignDefaultShippingProfile = async (
  container: MedusaContainer,
  product_id: string,
) => {
  await batchAssignDefaultShippingProfile(container, [product_id])
}

export const batchAssignDefaultShippingProfile = async (
  container: MedusaContainer,
  product_ids: string[]
) => {
  if (!product_ids.length) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const logger = container.resolve("logger")

  // 1. Get default shipping profile (Single Query)
  const { data: shippingProfiles } = await query.graph({
    entity: 'shipping_profile',
    fields: ['id'],
    filters: {
      type: 'default'
    }
  })

  const profile = shippingProfiles[0]

  if (!profile) {
    logger.warn("No default shipping profile found, skipping assignment")
    return
  }

  // 2. Check existing links for ALL products (Single Query)
  const { data: existingLinks } = await query.graph({
    entity: 'product_shipping_profile',
    fields: ['product_id'],
    filters: {
      product_id: product_ids
    }
  })

  const existingProductIds = new Set(existingLinks.map((l: any) => l.product_id))

  // 3. Filter products needing assignment
  const productsToAssign = product_ids.filter(id => !existingProductIds.has(id))

  if (productsToAssign.length === 0) {
    return
  }

  // 4. Batch Create Links (Single Operation)
  const links = productsToAssign.map(productId => ({
    [Modules.PRODUCT]: {
      product_id: productId
    },
    [Modules.FULFILLMENT]: {
      shipping_profile_id: profile.id
    }
  }))

  await link.create(links)

  logger.debug(`Assigned default shipping profile to ${links.length} products`)
}