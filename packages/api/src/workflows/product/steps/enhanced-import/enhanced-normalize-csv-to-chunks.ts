import { CsvError, parse, Parser } from "csv-parse"
import type { HttpTypes, IFileModuleService } from "@medusajs/framework/types"
import {
  MedusaError,
  Modules,
  productValidators,
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
// Use EnhancedCSVNormalizer instead of the standard one
import { EnhancedCSVNormalizer } from "../../../../modules/enhanced-product-import/utils/enhanced-csv-normalizer"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaErrorTypes, toHandle } from "@medusajs/framework/utils"
import { ENHANCED_PRODUCT_IMPORT_MODULE } from "../../../../modules/enhanced-product-import"
import type { CategoryWithAttributes, CategoryAttributeWithValues } from "../../../../modules/enhanced-product-import/types"
import EnhancedProductImportService from "../../../../modules/enhanced-product-import/services/enhanced-product-import.service"
import { Logger } from "@medusajs/framework/types"
import SellerBrandLink from "../../../../links/seller-brand"
import { logger } from "@medusajs/framework"

export type EnhancedNormalizeProductCsvStepInput = {
  fileKey: string
  sellerId: string
}

export const enhancedNormalizeCsvToChunksStepId = "enhanced-normalize-product-csv-to-chunks"

type Chunk = { id: string; toCreate: number; toUpdate: number }
type BrandValidationFunction = (brandHandle: string, rowNumber: number) => void
type DefaultsData = {
  defaultSalesChannelId: string | null
  defaultShippingProfileId: string | null
  salesChannelIds: Set<string>
  shippingProfileIds: Set<string>
}

/**
 * Processes a chunk of products by writing them to a file. Later the
 * file will be processed after the import has been confirmed.
 */
async function processChunk(
  file: IFileModuleService,
  fileKey: string,
  csvRows: ReturnType<(typeof EnhancedCSVNormalizer)["preProcess"]>[],
  currentRowNumber: number,
  sellerId: string,
  validateBrand: BrandValidationFunction,
  defaultsData: DefaultsData
): Promise<Chunk> {
  // Use EnhancedCSVNormalizer
  // console.log(" csvRows : ", csvRows)
  const normalizer = new EnhancedCSVNormalizer(csvRows)
  const products = normalizer.proccess(currentRowNumber)

  // Validate brand access for all products in this chunk
  csvRows.forEach((row, index) => {
    if (row.brand) {
      validateBrand(row.brand, currentRowNumber + index + 1)
    }
  })

  // Process products for creation
  let create = Object.keys(products.toCreate).map(toCreateHandle => {
    const product = products.toCreate[toCreateHandle]
    return prepareProductForCreation(product, sellerId, defaultsData)
  })

  // Process products for update
  let update = Object.keys(products.toUpdate).map(toUpdateId => {
    const product = products.toUpdate[toUpdateId]
    return prepareProductForUpdate(product, sellerId, defaultsData)
  })

  const toCreate = create.length
  const toUpdate = update.length

  const { id } = await file.createFiles({
    filename: `${fileKey}.json`,
    content: JSON.stringify({ create, update }),
    mimeType: "application/json",
  })

  /**
   * Release products from the memory
   */
  create = []
  update = []

  return {
    id,
    toCreate,
    toUpdate,
  }
}

/**
 * Finds the category key in the row
 */
export function findCategoryKey(row: any): string {
  return Object.keys(row).find(k => k.toLowerCase().startsWith("product category")) || ""
}

/**
 * Determines the cache key for the category (uses empty string if no category)
 */
export function getCacheKey(categoryValue: string | undefined): string {
  return categoryValue || ''
}

async function getCategoryById(productId: string, remoteQuery: any, logger: Logger): Promise<string> {
  try {
    // First, get the product to find its category IDs
    const { data: products } = await remoteQuery.graph({
      entity: "product",
      fields: ["id", "categories.id", "categories.name"],
      filters: { id: productId }
    });

    if (!products.length) {
      logger.warn(`[Enhanced Import] Product with ID ${productId} not found`);
      return '';
    }

    const product = products[0];
    if (!product.categories || !product.categories.length) {
      logger.warn(`[Enhanced Import] No categories found for product ID ${productId}`);
      return '';
    }

    // Return the name of the first category (or you could return all category names if needed)
    return product.categories[0].name;
  } catch (error) {
    logger.error(`[Enhanced Import] Error retrieving category for product ${productId}:`, error);
    return '';
  }
}


/**
 * Processes and normalizes a single CSV row
 */
async function processAndNormalizeRow(
  row: any,
  currentCSVRow: number,
  categoryAttributeCache: Map<string, CategoryWithAttributes>,
  remoteQuery: any,
  container: any,
  enhancedImportService: EnhancedProductImportService,
  logger: Logger
): Promise<ReturnType<(typeof EnhancedCSVNormalizer)["preProcess"]>> {
  const categoryKey = findCategoryKey(row)
  const categoryValue = row["product id"] ? await getCategoryById(row["product id"], remoteQuery, logger) : row[categoryKey]


  // Lazy load category attributes if not cached
  const cacheKey = getCacheKey(categoryValue)

  if (!categoryAttributeCache.has(cacheKey)) {
    if (categoryValue) {
      logger.info(`[Multi-Category] New category detected: "${categoryValue}" at row ${currentCSVRow}`)
    } else {
      logger.info(`[Multi-Category] Loading global attributes for products without category at row ${currentCSVRow}`)
    }

    const result = await initializeCategoryData(
      categoryValue,
      remoteQuery,
      container,
      enhancedImportService,
      logger
    )

    categoryAttributeCache.set(cacheKey, result)
    logger.info(
      `[Multi-Category] Cached ${result.attributes.length} attributes ${categoryValue ? `for "${categoryValue}"` : '(global only)'}`
    )
  }

  const categoryAttributes = categoryAttributeCache.get(cacheKey)!

  // Create a copy of row to avoid modifying the original
  const rowCopy = { ...row }
  if (categoryKey && categoryAttributes.id) {
    rowCopy[categoryKey] = categoryAttributes.id
  }

  return EnhancedCSVNormalizer.preProcess(rowCopy, currentCSVRow, categoryAttributes)
}

/**
 * Gets the unique value for a row (product ID or handle)
 */
export function getRowUniqueValue(normalizedRow: any): string | undefined {
  return normalizedRow["product id"] || normalizedRow["product handle"]
}

/**
 * Determines if a new chunk should be created based on row count and product uniqueness
 */
export function shouldCreateNewChunk(
  rowsReadSoFar: number,
  currentRowUniqueValue: string | undefined,
  rowValueValue: string | undefined,
  rowsToRead: number
): boolean {
  return rowsReadSoFar > rowsToRead && rowValueValue !== currentRowUniqueValue;
}

/**
 * Processes and adds a completed chunk to the chunks array
 */
async function processAndAddChunk(
  chunks: Chunk[],
  file: IFileModuleService,
  fileKey: string,
  rows: ReturnType<(typeof EnhancedCSVNormalizer)["preProcess"]>[],
  currentCSVRow: number,
  sellerId: string,
  validateBrand: BrandValidationFunction,
  defaultsData: DefaultsData
): Promise<ReturnType<(typeof EnhancedCSVNormalizer)["preProcess"]>[]> {
  chunks.push(
    await processChunk(
      file,
      `${fileKey}-${chunks.length + 1}`,
      rows,
      currentCSVRow,
      sellerId,
      validateBrand,
      defaultsData
    )
  )

  // Reset rows for next chunk
  return []
}

/**
 * Finalizes remaining rows into the last chunk
 */
async function finalizeRemainingRows(
  rows: ReturnType<(typeof EnhancedCSVNormalizer)["preProcess"]>[],
  chunks: Chunk[],
  file: IFileModuleService,
  fileKey: string,
  currentCSVRow: number,
  sellerId: string,
  validateBrand: BrandValidationFunction,
  defaultsData: DefaultsData
): Promise<void> {
  if (rows.length) {
    chunks.push(
      await processChunk(
        file,
        `${fileKey}-${chunks.length + 1}`,
        rows,
        currentCSVRow,
        sellerId,
        validateBrand,
        defaultsData
      )
    )
  }
}

/**
 * Logs the completion summary
 */
function logCompletionSummary(categoryAttributeCache: Map<string, CategoryWithAttributes>, chunks: Chunk[], logger: Logger): void {
  logger.info(
    `[Multi-Category] CSV processing complete. ` +
    `Categories processed: ${categoryAttributeCache.size}, ` +
    `Total attribute queries: ${categoryAttributeCache.size}, ` +
    `Chunks created: ${chunks.length}`
  )
}

/**
 * Creates chunks by reading CSV rows from the stream
 */
async function createChunks(
  file: IFileModuleService,
  fileKey: string,
  stream: Parser,
  sellerId: string,
  remoteQuery: any,
  container: any,
  enhancedImportService: EnhancedProductImportService,
  logger: Logger,
  validateBrand: BrandValidationFunction,
  defaultsData: DefaultsData
): Promise<Chunk[]> {
  const rowsToRead = 1000
  let currentCSVRow = 0
  let rowsReadSoFar = 0
  const chunks: Chunk[] = []
  let rows: ReturnType<(typeof EnhancedCSVNormalizer)["preProcess"]>[] = []
  let currentRowUniqueValue: string | undefined

  try {
    const categoryAttributeCache = new Map<string, CategoryWithAttributes>()

    for await (const rawRow of stream) {
      rowsReadSoFar++
      currentCSVRow++

      const normalizedRow = await processAndNormalizeRow(
        rawRow,
        currentCSVRow,
        categoryAttributeCache,
        remoteQuery,
        container,
        enhancedImportService,
        logger
      )

      const rowValueValue = getRowUniqueValue(normalizedRow)

      if (shouldCreateNewChunk(rowsReadSoFar, currentRowUniqueValue, rowValueValue, rowsToRead)) {
        rows = await processAndAddChunk(
          chunks,
          file,
          fileKey,
          rows,
          currentCSVRow,
          sellerId,
          validateBrand,
          defaultsData
        )
        rowsReadSoFar = 0
      }

      rows.push(normalizedRow)
      currentRowUniqueValue = rowValueValue
    }

    await finalizeRemainingRows(
      rows,
      chunks,
      file,
      fileKey,
      currentCSVRow,
      sellerId,
      validateBrand,
      defaultsData
    )

    logCompletionSummary(categoryAttributeCache, chunks, logger)
  } catch (error) {
    if (!stream.destroyed) {
      stream.destroy()
    }

    logger.error(`[Enhanced Import] Error processing chunks for file ${fileKey}:`, error)
    await file.deleteFiles(chunks.map((chunk) => chunk.id).concat(fileKey))
    throw error
  }

  return chunks
}

/**
 * This step parses a CSV file holding products to import, returning the chunks
 * to be processed. Each chunk is written to a file using the file provider.
 */
export const enhancedNormalizeCsvToChunksStep = createStep(
  enhancedNormalizeCsvToChunksStepId,
  async (input: EnhancedNormalizeProductCsvStepInput, { container }) => {
    return new Promise<
      StepResponse<{
        chunks: Chunk[]
        summary: Omit<Chunk, "id">
      }>
    >(async (resolve, reject) => {
      try {
        const file = container.resolve<IFileModuleService>(Modules.FILE)
        const enhancedImportService = container.resolve<EnhancedProductImportService>(ENHANCED_PRODUCT_IMPORT_MODULE)
        const logger = container.resolve<Logger>("logger")
        const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
        const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
        const fulfillmentService = container.resolve(Modules.FULFILLMENT)

        // Fetch authorized brands for the seller
        const authorizedBrands = await fetchAuthorizedBrands(input.sellerId, remoteQuery)
        const validateBrand = createBrandValidator(authorizedBrands)
        logger.info(`[Enhanced Import] Seller ${input.sellerId} authorized for ${authorizedBrands.size} brands: ${Array.from(authorizedBrands).join(', ')}`)

        // Fetch default sales channels and shipping profiles (like seller import)
        const defaultsData = await fetchDefaultsForImport(remoteQuery, salesChannelService, fulfillmentService, logger)
        logger.info(`[Enhanced Import] Default sales channel: ${defaultsData.defaultSalesChannelId}, default shipping profile: ${defaultsData.defaultShippingProfileId}`)

        const contents = await file.getDownloadStream(input.fileKey)

        const transformer = parse({
          columns: true,
          skip_empty_lines: true,
        })

        contents.on("error", reject)

        const chunks = await createChunks(
          file,
          input.fileKey,
          contents.pipe(transformer),
          input.sellerId,
          remoteQuery,
          container,
          enhancedImportService,
          logger,
          validateBrand,
          defaultsData
        )

        const summary = chunks.reduce<{ toCreate: number; toUpdate: number }>(
          (result, chunk) => {
            result.toCreate = result.toCreate + chunk.toCreate
            result.toUpdate = result.toUpdate + chunk.toUpdate
            return result
          },
          { toCreate: 0, toUpdate: 0 }
        )

        /**
         * Delete CSV file once we have the chunks
         */
        await file.deleteFiles(input.fileKey)

        resolve(
          new StepResponse({
            chunks,
            summary,
          })
        )
      } catch (error) {
        if (error instanceof CsvError) {
          return reject(
            new MedusaError(MedusaErrorTypes.INVALID_DATA, error.message)
          )
        }
        reject(error)
      }
    })
  }
)

/**
 * Fetches authorized brand handles for a seller
 */
async function fetchAuthorizedBrands(sellerId: string, remoteQuery: any): Promise<Set<string>> {
  const { data: sellerBrandLinks } = await remoteQuery.graph({
    entity: SellerBrandLink.entryPoint,
    fields: ["*", "brand.*"],
    filters: { seller_id: sellerId }
  })

  return new Set(
    sellerBrandLinks.map((link: any) => link.brand?.name).filter(Boolean)
  )
}

/**
 * Creates a brand validation function for the seller
 */
function createBrandValidator(authorizedBrands: Set<string>): BrandValidationFunction {
  return (brandName: string, rowNumber: number) => {
    if (brandName && !authorizedBrands.has(brandName)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Row ${rowNumber}: Unauthorized brand '${brandName}'. Seller can only import products for authorized brands: ${Array.from(authorizedBrands).join(', ')}`
      )
    }
  }
}


/**
 * Initializes category data for a given category value
 * Handles both products with categories and products without categories
 * @param categoryValue - Category name from CSV, or null/undefined for products without category
 */
async function initializeCategoryData(
  categoryValue: string | undefined,
  remoteQuery: any,
  container: any,
  enhancedImportService: EnhancedProductImportService,
  logger: Logger
): Promise<CategoryWithAttributes> {
  if (!categoryValue) {
    // No category - fetch only global attributes
    logger.info(`[Enhanced Import] No category specified, loading global attributes`)
    const categoryAttributes = await enhancedImportService.getGlobalAttributesWithValues(container)
    logger.debug(`[Enhanced Import] Global attributes loaded: ${categoryAttributes.length}`)
    categoryAttributes.forEach(attr => {
      logger.debug(`[Enhanced Import] Global attribute: ${attr.attribute.name} (handle: ${attr.attribute.handle})`)
    })
    return { id: undefined, attributes: categoryAttributes }
  }

  logger.info(`[Enhanced Import] Initializing category: ${categoryValue}`)

  // This already includes global attributes merged with category-specific ones
  const category = await enhancedImportService.getCategoryWithAttributesByName(categoryValue, container)
  logger.info(`[Enhanced Import] Loaded ${category.attributes.length} attributes for category`)
  logger.debug(`[Enhanced Import] Category-specific + Global attributes for "${categoryValue}":`)
  // category.attributes.forEach(attr => {
  //   logger.debug(`[Enhanced Import] Attribute: ${attr.attribute.name} (handle: ${attr.attribute.handle})`)
  // })

  if (!category.attributes.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Category with name '${categoryValue}' does not exist in database`)
  }

  return { id: category.id, attributes: category.attributes }
}

/**
 * Extracts enhanced data from a product to avoid Zod validation errors
 */
function extractEnhancedData(product: any): {
  config: Record<string, any>
  attributes: any[]
  sellerId: string
  brand?: string
  imageUrls?: string[]
  targetStatus?: string
} {
  // Configuration keys that should be stored in the product_configuration table
  const configKeys = ['is_returnable', 'is_exchangeable', 'is_try_and_buy', 'returnable_days']

  const enhancedConfig: Record<string, any> = {}

  // Extract config keys
  configKeys.forEach(key => {
    if (product[key] !== undefined) {
      enhancedConfig[key] = product[key]
      delete product[key]
    }
  })

  // Handle brand separately (not for product_configuration table)
  const brand = product.brand
  delete product.brand

  const productAttributes = product.attributes || []
  delete product.attributes

  const productSellerId = product.seller_id
  delete product.seller_id

  // Extract image data for serverless processing
  const imageUrls = product._pending_images
  delete product._pending_images

  const targetStatus = product._target_status
  delete product._target_status

  return {
    config: enhancedConfig,
    attributes: productAttributes,
    sellerId: productSellerId,
    brand,
    imageUrls,
    targetStatus
  }
}

/**
 * Prepares a product for creation by injecting seller_id and cleaning up data
 */
function prepareProductForCreation(
  product: any,
  sellerId: string,
  defaultsData: DefaultsData
): HttpTypes.AdminCreateProduct {
  // Inject seller ID (mandatory)
  product.seller_id = sellerId

  // Apply all defaults for product creation (sales channels, shipping profiles, variant inventory)
  applyCreateDefaults(product, defaultsData)

  // Extract enhanced data
  const { config, attributes, sellerId: extractedSellerId, brand, imageUrls, targetStatus } = extractEnhancedData(product)

  // Clean up internal tracking properties before Zod validation
  delete product._configProcessed

  // Validate with Zod
  const validatedBody = productValidators.CreateProduct.parse(product) as HttpTypes.AdminCreateProduct

  // Re-attach enhanced data (without image data - that's in chunk-level additional_data)
  // @ts-expect-error - additional_data not in type definition
  validatedBody.additional_data = {
    configuration: config,
    attributes: attributes,
    seller_id: extractedSellerId,
    brand: brand,
    imageUrls: imageUrls,  // Changed from _imageUrls to imageUrls
    targetStatus: targetStatus  // Changed from _targetStatus to targetStatus
  }

  return validatedBody
}

/**
 * Fetches default sales channels and shipping profiles for import
 * Same logic as in seller import
 */
async function fetchDefaultsForImport(
  remoteQuery: any,
  salesChannelService: any,
  fulfillmentService: any,
  logger: Logger
): Promise<DefaultsData> {
  // Get default sales channel from store (same as seller import logic)
  const { data: stores } = await remoteQuery.graph({
    entity: "store",
    fields: ["default_sales_channel_id", "shipping_profile_id"],
    pagination: { take: 1, skip: 0 },
  })

  const defaultSalesChannelId = stores?.[0]?.default_sales_channel_id || null
  const storeShippingProfileId = stores?.[0]?.shipping_profile_id || null

  // Get all available sales channels and shipping profiles for validation
  const [allSalesChannels, allShippingProfiles] = await Promise.all([
    salesChannelService.listSalesChannels({}, { select: ['id', 'name'] }),
    fulfillmentService.listShippingProfiles({}, { select: ['id', 'name'] })
  ])

  // Create lookup sets for performance
  const salesChannelIds = new Set<string>(allSalesChannels.map((sc: any) => sc.id))
  const shippingProfileIds = new Set<string>(allShippingProfiles.map((sp: any) => sp.id))

  // Find a default shipping profile if store doesn't have one
  let defaultShippingProfileId = storeShippingProfileId
  if (!defaultShippingProfileId && allShippingProfiles.length > 0) {
    // Use first available shipping profile as fallback
    defaultShippingProfileId = allShippingProfiles[0].id
    logger.info(`[Enhanced Import] Using first available shipping profile as default: ${allShippingProfiles[0].name}`)
  }

  return {
    defaultSalesChannelId,
    defaultShippingProfileId,
    salesChannelIds,
    shippingProfileIds
  }
}

/**
 * Applies minimal defaults for UPDATE operations (only variant inventory management)
 * Does NOT modify sales channels or shipping profiles - preserves existing product data
 */
export function applyUpdateDefaults(
  product: any
): void {
  // Set manage_inventory to true ONLY for NEW variants (those without an id)
  // Existing variants (with id) are being updated and should preserve their settings
  if (product.variants && Array.isArray(product.variants)) {
    product.variants = product.variants.map((variant: any, index: number) => {
      // Only set manage_inventory default for NEW variants (no ID)
      const updatedVariant = {
        ...variant,
        manage_inventory: variant.id ? variant.manage_inventory : (variant.manage_inventory ?? true)
      }

      return updatedVariant
    })
  }

  // NOTE: Unlike CREATE, we do NOT set sales channel or shipping profile defaults
  // to preserve existing product data when these fields are omitted from the CSV
}

/**
 * Applies all product defaults for CREATE operations (sales channels, shipping profiles, variant inventory)
 */
export function applyCreateDefaults(
  product: any,
  defaultsData: DefaultsData
): void {
  // Set manage_inventory to true for all variants (Medusa default for inventory tracking)
  if (product.variants && Array.isArray(product.variants)) {
    product.variants = product.variants.map((variant: any) => ({
      ...variant,
      manage_inventory: variant.manage_inventory ?? true
    }))
  }
  // Handle sales channels
  let salesChannels = product.sales_channels

  if (!salesChannels?.length) {
    if (defaultsData.defaultSalesChannelId) {
      // No sales channels specified for CREATE - use default
      product.sales_channels = [{ id: defaultsData.defaultSalesChannelId }]
    }
    // For UPDATE, don't set defaults if not provided
  } else {
    // Validate existing sales channels
    const validSalesChannels = salesChannels.filter((sc: any) => {
      return defaultsData.salesChannelIds.has(sc.id)
    })

    if (validSalesChannels.length === 0) {
      if (defaultsData.defaultSalesChannelId) {
        // All provided sales channels were invalid for CREATE - fall back to default
        product.sales_channels = [{ id: defaultsData.defaultSalesChannelId }]
      } else {
        // For UPDATE or if no default available, remove invalid sales channels
        delete product.sales_channels
      }
    } else {
      product.sales_channels = validSalesChannels
    }
  }

  // Handle shipping profile
  let shippingProfileId = product.shipping_profile_id

  if (!shippingProfileId) {
    if (defaultsData.defaultShippingProfileId) {
      // No shipping profile specified for CREATE - use default
      product.shipping_profile_id = defaultsData.defaultShippingProfileId
    }
    // For UPDATE, don't set defaults if not provided
  } else {
    // Validate existing shipping profile
    if (!defaultsData.shippingProfileIds.has(shippingProfileId)) {
      if (defaultsData.defaultShippingProfileId) {
        // Invalid shipping profile for CREATE - fall back to default
        product.shipping_profile_id = defaultsData.defaultShippingProfileId
      } else {
        // For UPDATE or if no default available, remove invalid shipping profile
        delete product.shipping_profile_id
      }
    }
    // If valid, keep the existing shipping_profile_id
  }
}

/**
 * Prepares a product for update by injecting seller_id and cleaning up data
 */
function prepareProductForUpdate(
  product: any,
  sellerId: string,
  defaultsData: DefaultsData
): HttpTypes.AdminUpdateProduct & { id: string } {
  // Inject seller ID (mandatory)
  product.seller_id = sellerId

  // Apply minimal defaults for product updates (only variant inventory)
  applyUpdateDefaults(product)

  // Extract enhanced data
  const { config, attributes, sellerId: extractedSellerId, brand, imageUrls, targetStatus } = extractEnhancedData(product)

  // Clean up internal tracking properties before Zod validation
  delete product._configProcessed

  // Validate with Zod
  const validatedBody = productValidators.UpdateProduct.parse(product) as HttpTypes.AdminUpdateProduct & { id: string }

  // Re-attach enhanced data (without image data - that's in chunk-level additional_data)
  // @ts-expect-error - additional_data not in type definition
  validatedBody.additional_data = {
    configuration: config,
    attributes: attributes,
    seller_id: extractedSellerId,
    brand: brand,  // Include brand for update flow
    imageUrls: imageUrls,  // Changed from _imageUrls to imageUrls
    targetStatus: targetStatus  // Changed from _targetStatus to targetStatus
  }

  // logger.debug(`[Enhanced Import] Validated product body for update: ${JSON.stringify(validatedBody)}`) // Commenting out to avoid build errors

  return validatedBody
}
