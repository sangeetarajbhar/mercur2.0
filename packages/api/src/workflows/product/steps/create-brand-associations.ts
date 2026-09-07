import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { LinkDefinition } from "@medusajs/framework/types"
import BrandModuleService from "../../../modules/brand/service"
import { BRAND_MODULE } from "../../../modules/brand"

export const createBrandAssociationsStepId = "create-brand-associations"

/**
 * Input interface for creating brand associations
 */
export interface CreateBrandAssociationsStepInput {
  products: Array<{ id: string; handle: string }>
  brandName: string
  transactionId?: string
}

/**
 * Result interface for brand associations step
 */
export interface CreateBrandAssociationsStepResult {
  brandProductLinks: number
  processedProductIds: string[]
  brandId?: string
}

/**
 * Create brand associations step
 * Handles product-brand links by looking up brand by name
 *
 * Compensation: Removes all brand associations made by this step
 */
export const createBrandAssociationsStep = createStep(
  createBrandAssociationsStepId,
  async (
    input: CreateBrandAssociationsStepInput,
    { container }
  ): Promise<StepResponse<CreateBrandAssociationsStepResult, LinkDefinition[]>> => {
    const brandService = container.resolve<BrandModuleService>(BRAND_MODULE)
    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
    const logger = container.resolve("logger")

    const processedProductIds: string[] = []
    let brandProductLinks = 0
    let brandId: string | undefined

    try {
      logger.info(`🔗 [BRAND_ASSOCIATIONS] Creating brand associations for ${input.products.length} products with brand: "${input.brandName}"`)
      logger.info(`🔗 [BRAND_ASSOCIATIONS] Product handles: [${input.products.map(p => p.handle).join(', ')}]`)
      logger.info(`🔗 [BRAND_ASSOCIATIONS] Product IDs: [${input.products.map(p => p.id).join(', ')}]`)

      if (input.transactionId) {
        logger.info(`🔗 [BRAND_ASSOCIATIONS] Transaction ID: ${input.transactionId}`)
      }

      // 1. Look up brand by name
      logger.info(`🔗 [BRAND_ASSOCIATIONS] Looking up brand with name: "${input.brandName}"`)
      const brand = await brandService.listBrands({ name: input.brandName }, { take: 1 })
        .then(res => {
          logger.info(`🔗 [BRAND_ASSOCIATIONS] Brand lookup result: ${res?.length ? `Found ${res.length} brand(s)` : 'No brands found'}`)
          if (res?.length) {
            logger.info(`🔗 [BRAND_ASSOCIATIONS] Found brand: ID="${res[0].id}", Name="${res[0].name}", Handle="${res[0].handle}"`)
          }
          return res?.[0]
        })
        .catch((error) => {
          logger.error(`🔗 [BRAND_ASSOCIATIONS] Error looking up brand: ${error.message}`)
          return null
        })

      if (!brand) {
        logger.warn(`❌ [BRAND_ASSOCIATIONS] Brand not found: "${input.brandName}" - No associations will be created`)
        return new StepResponse({
          brandProductLinks: 0,
          processedProductIds: [],
          brandId: undefined
        }, [])
      }

      brandId = brand.id
      logger.info(`✅ [BRAND_ASSOCIATIONS] Brand found! ID: ${brandId}, Name: "${brand.name}"`)

      // 2. Create brand-product links
      logger.info(`🔗 [BRAND_ASSOCIATIONS] Creating ${input.products.length} brand-product link definitions`)
      const brandProductRemoteLinks: LinkDefinition[] = input.products.map((product, index) => {
        const linkDef = {
          [Modules.PRODUCT]: {
            product_id: product.id
          },
          [BRAND_MODULE]: {
            brand_id: brand.id
          }
        }
        logger.info(`🔗 [BRAND_ASSOCIATIONS] Link ${index + 1}/${input.products.length}: Product="${product.handle}" (${product.id}) -> Brand="${brand.name}" (${brand.id})`)
        return linkDef
      })

      if (brandProductRemoteLinks.length > 0) {
        logger.info(`🔗 [BRAND_ASSOCIATIONS] Executing remoteLink.create() for ${brandProductRemoteLinks.length} links...`)
        await remoteLink.create(brandProductRemoteLinks)
        brandProductLinks = brandProductRemoteLinks.length
        processedProductIds.push(...input.products.map(p => p.id))
        logger.info(`✅ [BRAND_ASSOCIATIONS] Successfully created ${brandProductLinks} brand-product links for brand: "${input.brandName}"`)
        logger.info(`✅ [BRAND_ASSOCIATIONS] Links created in junction table: product_product_brand_brand`)
      } else {
        logger.warn(`⚠️ [BRAND_ASSOCIATIONS] No links to create`)
      }

      const result: CreateBrandAssociationsStepResult = {
        brandProductLinks,
        processedProductIds,
        brandId
      }

      logger.info(`🎉 [BRAND_ASSOCIATIONS] Brand associations completed: ${brandProductLinks} links for brand "${input.brandName}"`)
      logger.info(`🎉 [BRAND_ASSOCIATIONS] Final result: brandId=${brandId}, processedProducts=${processedProductIds.length}`)

      return new StepResponse(result, brandProductRemoteLinks)

    } catch (error) {
      logger.error(`❌ [BRAND_ASSOCIATIONS] Brand association creation step failed for brand "${input.brandName}":`, error)
      logger.error(`❌ [BRAND_ASSOCIATIONS] Context: brandName=${input.brandName}, productCount=${input.products.length}, transactionId=${input.transactionId}`)
      throw error
    }
  },

  // Compensation function: Remove brand associations for products that were processed
  async (linksToDismiss: LinkDefinition[] | undefined, { container }) => {
    if (!linksToDismiss?.length) {
      return
    }

    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
    const logger = container.resolve("logger")

    logger.info(`Rolling back ${linksToDismiss.length} brand associations`)

    try {
      // Correct Batch Dismissal
      await remoteLink.dismiss(linksToDismiss)
      logger.info(`Rolled back brand associations`)
    } catch (error) {
      logger.error(`Failed to batch rollback brand associations:`, error)
    }
  }
)