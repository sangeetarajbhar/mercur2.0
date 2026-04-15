import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ENHANCED_PRODUCT_IMPORT_MODULE } from "../../../modules/enhanced-product-import"
import { PRODUCT_CONFIGURATION_MODULE, ProductConfigurationInput } from "../../../modules/product-configuration"
import EnhancedProductImportService from "../../../modules/enhanced-product-import/services/enhanced-product-import.service"
import ProductConfigurationService from "../../../modules/product-configuration/service"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { LinkDefinition } from "@medusajs/framework/types"

export const createProductConfigurationsStepId = "create-product-configurations"

export interface CreateProductConfigurationsStepInput {
  products: Array<{ id: string; handle: string }>
  productConfigurations: Array<{
    productHandle: string
    config: ProductConfigurationInput
  }>
  transactionId?: string
}

export interface CreateProductConfigurationsStepOutput {
  processed: number
  successful: number
  failed: Array<{ productId: string; error: string }>
  processedProductIds: string[]
  linksToCreate: LinkDefinition[]
  productConfigs: any[]
}

export const createProductConfigurationsStep = createStep(
  createProductConfigurationsStepId,

  // 1. Step Handler
  async (input: CreateProductConfigurationsStepInput, { container }) => {
    const enhancedImportService = container.resolve<EnhancedProductImportService>(ENHANCED_PRODUCT_IMPORT_MODULE)
    const logger = container.resolve("logger")

    const processedProductIds: string[] = []
    const linksToCreate: LinkDefinition[] = []
    const productConfigs: any[] = []

    try {
      logger.info(`Processing configurations for ${input.products.length} products`)

      const { existing, toCreate } = separateConfigs(input)

      // Handle existing config linking
      if (existing.length > 0) {
        await linkExistingConfigs(existing, container, processedProductIds, linksToCreate, logger)
      }

      // Handle new config creation
      if (toCreate.length > 0) {
        await createNewConfigs(toCreate, processedProductIds, linksToCreate, productConfigs, enhancedImportService, container, logger)
      }

      logger.info(`Configuration processing completed: ${linksToCreate.length} associations created`)

      const result: CreateProductConfigurationsStepOutput = {
        processed: input.products.length,
        successful: linksToCreate.length,
        failed: [],
        processedProductIds,
        linksToCreate,
        productConfigs
      }

      return new StepResponse(result, processedProductIds)

    } catch (error) {
      logger.error(`Configuration creation step failed:`, error)
      throw error
    }
  },

  // 2. Compensation Function
  async (processedProductIds: string[] | undefined, { container }) => {
    if (!processedProductIds?.length) return

    const enhancedImportService = container.resolve<EnhancedProductImportService>(ENHANCED_PRODUCT_IMPORT_MODULE)
    const logger = container.resolve("logger")

    await rollbackConfigurations(enhancedImportService, processedProductIds, container, logger)
  }
)

// =========================================================================
// Helper Functions (SRP)
// =========================================================================

function separateConfigs(input: CreateProductConfigurationsStepInput) {
  const existing: Array<{ productId: string, configId: string }> = []
  const toCreate: Array<{ productId: string, config: ProductConfigurationInput }> = []

  for (const product of input.products) {
    const configEntry = input.productConfigurations.find(
      c => c.productHandle === product.handle
    )

    if (configEntry?.config) {
      if (configEntry.config.id) {
        existing.push({ productId: product.id, configId: configEntry.config.id })
      } else {
        toCreate.push({ productId: product.id, config: configEntry.config })
      }
    }
  }
  return { existing, toCreate }
}

async function linkExistingConfigs(
  items: Array<{ productId: string, configId: string }>,
  container: any,
  processedProductIds: string[],
  linksToCreate: LinkDefinition[],
  logger: any
) {
  logger.info(`Linking ${items.length} products to existing configurations`)

  const productConfigService = container.resolve(PRODUCT_CONFIGURATION_MODULE) as ProductConfigurationService
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  // Batch validate configs (Single Query)
  const configIds = items.map(i => i.configId)

  // Note: listProductConfigurations might throw if service method doesn't support list
  // fallback if needed, but assuming standard Medusa service
  const configs = await productConfigService.listProductConfigurations({ id: configIds }, { select: ['id'] })
  const validConfigIds = new Set(configs.map(c => c.id))

  const validItems = items.filter(i => validConfigIds.has(i.configId))

  if (validItems.length < items.length) {
    logger.warn(`Skipped ${items.length - validItems.length} invalid configuration IDs`)
  }

  const newLinks = validItems.map(({ productId, configId }) => ({
    [Modules.PRODUCT]: { product_id: productId },
    [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: configId }
  }))

  if (newLinks.length > 0) {
    await link.create(newLinks)
    linksToCreate.push(...newLinks)
    processedProductIds.push(...validItems.map(i => i.productId))
  }
}

async function createNewConfigs(
  items: Array<{ productId: string, config: ProductConfigurationInput }>,
  processedProductIds: string[],
  linksToCreate: LinkDefinition[],
  productConfigs: any[],
  enhancedImportService: EnhancedProductImportService,
  container: any,
  logger: any
) {
  logger.info(`Creating new configurations for ${items.length} products`)

  const results = await enhancedImportService.createProductConfigurationsWithLinks(
    items,
    undefined,
    container
  )

  results.forEach((item) => {
    const linkData: LinkDefinition = {
      [Modules.PRODUCT]: { product_id: item.productId },
      [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: item.config.id }
    }
    linksToCreate.push(linkData)
    processedProductIds.push(item.productId)
    productConfigs.push(item.config)
  })
}

async function rollbackConfigurations(
  service: EnhancedProductImportService,
  productIds: string[],
  container: any,
  logger: any
) {
  logger.info(`Rolling back configurations for ${productIds.length} products`)

  try {
    await service.batchRemoveProductConfigurations(productIds, container)
    logger.info(`Rolled back configurations for ${productIds.length} products`)
  } catch (error) {
    logger.error(`Failed to batch rollback configurations:`, error)
  }

  logger.info(`Configuration rollback completed`)
}