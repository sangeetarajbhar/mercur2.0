import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { LinkDefinition } from "@medusajs/framework/types"
import BrandModuleService from "../../../modules/brand/service"
import { BRAND_MODULE } from "../../../modules/brand"

export const createBatchBrandAssociationsStepId = "create-batch-brand-associations"

/**
 * Input interface for creating batch brand associations
 */
export interface CreateBatchBrandAssociationsStepInput {
  productBrandMappings: Array<{
    productId: string
    productHandle: string
    brandName: string
  }>
  transactionId?: string
}

/**
 * Result interface for batch brand associations step
 */
export interface CreateBatchBrandAssociationsStepResult {
  totalLinks: number
  processedProducts: number
  brandMappings: Record<string, string> // brandName -> brandId
  skippedProducts: Array<{ productId: string; reason: string }>
}

/**
 * Internal storage for previous associations that need to be restored during compensation
 */
interface BatchBrandAssociationStepData {
  linksCreated: LinkDefinition[]
  linksToRestore: LinkDefinition[]
}

/**
 * Create batch brand associations step
 * Handles multiple product-brand mappings in a single batch operation
 *
 * Compensation: Removes all brand associations made by this step and restores previous associations
 */
export const createBatchBrandAssociationsStep = createStep(
  createBatchBrandAssociationsStepId,
  async (
    input: CreateBatchBrandAssociationsStepInput,
    { container }
  ): Promise<StepResponse<CreateBatchBrandAssociationsStepResult, BatchBrandAssociationStepData>> => {
    const brandService = container.resolve<BrandModuleService>(BRAND_MODULE)
    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve("logger")

    const brandMappings: Record<string, string> = {}
    const skippedProducts: Array<{ productId: string; reason: string }> = []
    const allBrandProductLinks: LinkDefinition[] = []
    const linksToRestore: LinkDefinition[] = []

    try {
      logger.info(`🔗 [BATCH_BRAND_ASSOCIATIONS] Creating batch brand associations for ${input.productBrandMappings.length} products`)

      if (input.transactionId) {
        logger.info(`🔗 [BATCH_BRAND_ASSOCIATIONS] Transaction ID: ${input.transactionId}`)
      }

      // 1. Get unique brand names
      const uniqueBrandNames = [...new Set(input.productBrandMappings.map(p => p.brandName))]
      logger.info(`🔗 [BATCH_BRAND_ASSOCIATIONS] Found ${uniqueBrandNames.length} unique brands: [${uniqueBrandNames.join(', ')}]`)

      // 2. Batch lookup all brands
      logger.info(`🔗 [BATCH_BRAND_ASSOCIATIONS] Looking up all brands in batch...`)
      const brands = await brandService.listBrands(
        { name: { $in: uniqueBrandNames } },
        { take: uniqueBrandNames.length }
      )

      logger.info(`🔗 [BATCH_BRAND_ASSOCIATIONS] Found ${brands.length}/${uniqueBrandNames.length} brands in database`)

      // Create brand name -> brand ID mapping
      brands.forEach(brand => {
        brandMappings[brand.name] = brand.id
        logger.info(`🔗 [BATCH_BRAND_ASSOCIATIONS] Mapped: "${brand.name}" -> ${brand.id}`)
      })

      // 3. Check for existing brand associations and store them for potential restoration
      logger.info(`🔍 [BATCH_BRAND_ASSOCIATIONS] Checking existing brand associations for products...`)
      const productIds = input.productBrandMappings.map(mapping => mapping.productId)
      const { data: existingAssociations } = await query.graph({
        entity: "product_brand",
        fields: ["id", "product_id", "brand_id"],
        filters: { product_id: { $in: productIds } }
      })

      if (existingAssociations && existingAssociations.length > 0) {
        logger.info(`🔍 [BATCH_BRAND_ASSOCIATIONS] Found ${existingAssociations.length} existing brand associations`)
        
        // Convert existing associations to LinkDefinition format for restoration later
        for (const existing of existingAssociations) {
          const existingLink: LinkDefinition = {
            [Modules.PRODUCT]: {
              product_id: existing.product_id
            },
            [BRAND_MODULE]: {
              brand_id: existing.brand_id
            }
          }
          linksToRestore.push(existingLink)
          logger.info(`🔍 [BATCH_BRAND_ASSOCIATIONS] Storing association for restoration: Product=${existing.product_id} -> Brand=${existing.brand_id}`)
        }
        
        // Remove existing associations before creating new ones
        logger.info(`.unlink [BATCH_BRAND_ASSOCIATIONS] Removing ${existingAssociations.length} existing brand associations...`)
        await remoteLink.dismiss(linksToRestore)
        logger.info(`.unlink [BATCH_BRAND_ASSOCIATIONS] Successfully removed existing brand associations`)
      } else {
        logger.info(`🔍 [BATCH_BRAND_ASSOCIATIONS] No existing brand associations found for the products`)
      }

      // 4. Create link definitions for all valid mappings
      for (const mapping of input.productBrandMappings) {
        const brandId = brandMappings[mapping.brandName]

        if (!brandId) {
          logger.warn(`❌ [BATCH_BRAND_ASSOCIATIONS] Brand not found: "${mapping.brandName}" for product "${mapping.productHandle}"`)
          skippedProducts.push({
            productId: mapping.productId,
            reason: `Brand not found: "${mapping.brandName}"`
          })
          continue
        }

        const linkDef: LinkDefinition = {
          [Modules.PRODUCT]: {
            product_id: mapping.productId
          },
          [BRAND_MODULE]: {
            brand_id: brandId
          }
        }

        allBrandProductLinks.push(linkDef)
        logger.info(`🔗 [BATCH_BRAND_ASSOCIATIONS] Queued link: Product="${mapping.productHandle}" (${mapping.productId}) -> Brand="${mapping.brandName}" (${brandId})`)
      }

      // 5. Execute all new links in single batch operation
      if (allBrandProductLinks.length > 0) {
        logger.info(`🔗 [BATCH_BRAND_ASSOCIATIONS] Creating ${allBrandProductLinks.length} brand-product links in single batch...`)
        await remoteLink.create(allBrandProductLinks)
        logger.info(`✅ [BATCH_BRAND_ASSOCIATIONS] Successfully created ${allBrandProductLinks.length} brand-product links`)
      } else {
        logger.warn(`⚠️ [BATCH_BRAND_ASSOCIATIONS] No valid brand-product links to create`)
      }

      const result: CreateBatchBrandAssociationsStepResult = {
        totalLinks: allBrandProductLinks.length,
        processedProducts: input.productBrandMappings.length - skippedProducts.length,
        brandMappings,
        skippedProducts,
      }

      logger.info(`🎉 [BATCH_BRAND_ASSOCIATIONS] Batch brand associations completed:`)
      logger.info(`🎉 [BATCH_BRAND_ASSOCIATIONS] - Total links created: ${result.totalLinks}`)
      logger.info(`🎉 [BATCH_BRAND_ASSOCIATIONS] - Products processed: ${result.processedProducts}/${input.productBrandMappings.length}`)
      logger.info(`🎉 [BATCH_BRAND_ASSOCIATIONS] - Skipped products: ${result.skippedProducts.length}`)
      logger.info(`🎉 [BATCH_BRAND_ASSOCIATIONS] - Previous associations stored for restoration: ${linksToRestore.length}`)

      // Return both the result and the data needed for compensation
      return new StepResponse(result, {
        linksCreated: allBrandProductLinks,
        linksToRestore: linksToRestore
      })

    } catch (error) {
      logger.error(`❌ [BATCH_BRAND_ASSOCIATIONS] Batch brand association creation failed:`, error)
      logger.error(`❌ [BATCH_BRAND_ASSOCIATIONS] Context: productCount=${input.productBrandMappings.length}, transactionId=${input.transactionId}`)
      throw error
    }
  },

  // Compensation function: Remove all brand associations made by this step and restore previous associations
  async (stepData: BatchBrandAssociationStepData | undefined, { container }) => {
    if (!stepData) {
      return
    }

    const { linksCreated, linksToRestore } = stepData
    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
    const logger = container.resolve("logger")

    logger.info(`🔄 [BATCH_BRAND_ASSOCIATIONS] Initiating compensation:`)
    logger.info(`🔄 [BATCH_BRAND_ASSOCIATIONS] - Links to remove: ${linksCreated?.length || 0}`)
    logger.info(`🔄 [BATCH_BRAND_ASSOCIATIONS] - Links to restore: ${linksToRestore?.length || 0}`)

    try {
      // Remove the associations created by this step
      if (linksCreated?.length) {
        logger.info(`🔄 [BATCH_BRAND_ASSOCIATIONS] Removing ${linksCreated.length} newly created brand associations...`)
        await remoteLink.dismiss(linksCreated)
        logger.info(`✅ [BATCH_BRAND_ASSOCIATIONS] Successfully removed newly created brand associations`)
      }

      // Restore the previous associations that were removed
      if (linksToRestore?.length) {
        logger.info(`🔄 [BATCH_BRAND_ASSOCIATIONS] Restoring ${linksToRestore.length} previous brand associations...`)
        await remoteLink.create(linksToRestore)
        logger.info(`✅ [BATCH_BRAND_ASSOCIATIONS] Successfully restored previous brand associations`)
      } else {
        logger.info(`🔄 [BATCH_BRAND_ASSOCIATIONS] No previous associations to restore`)
      }

      logger.info(`✅ [BATCH_BRAND_ASSOCIATIONS] Compensation completed successfully`)
    } catch (error) {
      logger.error(`❌ [BATCH_BRAND_ASSOCIATIONS] Failed to perform compensation:`, error)
      throw error
    }
  }
)