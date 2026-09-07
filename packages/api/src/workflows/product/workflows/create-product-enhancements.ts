import {
  WorkflowData,
  WorkflowResponse,
  createHook,
  createWorkflow,
  transform,
  when,
  parallelize,
} from "@medusajs/framework/workflows-sdk"
import { createProductAttributesStep } from "../steps/create-product-attributes"
import { createProductConfigurationsStep } from "../steps/create-product-configurations"
import { createSellerAssociationsStep } from "../steps/create-seller-associations"
import { createBatchBrandAssociationsStep } from "../steps/create-batch-brand-associations"
import { publishImageJobsStep } from "../steps/publish-image-jobs"
import { upsertSellerInventoryAssociationsStep } from "../steps/upsert-seller-inventory-associations"

/**
 * Input for creating product enhancements
 */
export interface CreateProductEnhancementsWorkflowInput {
  /**
   * The products that were created
   */
  products: Array<{ id: string; handle: string; thumbnail?: string | null }>
  /**
   * Attribute assignments for products
   */
  attributeAssignments?: Array<{
    productHandle: string
    attributes: Array<{ name: string; value: string }>
  }>
  /**
   * Configuration assignments for products
   */
  productConfigurations?: Array<{
    productHandle: string
    config: Record<string, any>
  }>
  /**
   * Seller ID for associations (required for CSV imports)
   */
  sellerId?: string
  /**
   * Per-product brand mappings
   */
  productBrandMappings?: Array<{
    productId: string
    productHandle: string
    brandName: string
  }>
  /**
   * Transaction ID for tracking
   */
  transactionId?: string
  /**
   * Pending images for serverless processing
   * Maps product handle to image URLs and target status
   */
  pendingImages?: Record<string, {
    urls: string[]
    targetStatus: string
  }>
}

export const createProductEnhancementsWorkflowId = "create-product-enhancements"

/**
 * This workflow adds enhancements (attributes, configurations, etc.) to newly created products.
 * It's designed to be triggered from product creation hooks.
 *
 * @example
 * const { result } = await createProductEnhancementsWorkflow(container)
 * .run({
 *   input: {
 *     products: [{ id: "prod_123", handle: "shirt" }],
 *     attributeAssignments: [{
 *       productHandle: "shirt",
 *       attributes: [{ name: "color", value: "blue" }]
 *     }],
 *     productConfigurations: [{
 *       productHandle: "shirt",
 *       config: { is_returnable: true }
 *     }],
 *     processAttributes: true,
 *     processConfigurations: true
 *   }
 * })
 */
export const createProductEnhancementsWorkflow = createWorkflow(
  createProductEnhancementsWorkflowId,
  (input: WorkflowData<CreateProductEnhancementsWorkflowInput>) => {

    // Log workflow invocation with detailed brand/category info
    transform({ input }, ({ input }, { container }) => {
      const logger = container.resolve("logger")
      logger.info(
        `🚀 [PRODUCT_ENHANCEMENTS] Processing ${input.products.length} products ` +
        `(attrs: ${!!input.attributeAssignments?.length}, configs: ${!!input.productConfigurations?.length})`
      )

      // Log detailed information about brand and seller
      if (input.productBrandMappings?.length) {
        const uniqueBrands = [...new Set(input.productBrandMappings.map(m => m.brandName))]
        logger.info(`🏷️ [PRODUCT_ENHANCEMENTS] Brands to associate: ${uniqueBrands.length} unique brands [${uniqueBrands.join(', ')}]`)
      } else {
        logger.warn(`⚠️ [PRODUCT_ENHANCEMENTS] No brand mappings provided - brand associations will be skipped`)
      }

      if (input.sellerId) {
        logger.info(`👤 [PRODUCT_ENHANCEMENTS] Seller ID: "${input.sellerId}"`)
      } else {
        logger.warn(`⚠️ [PRODUCT_ENHANCEMENTS] No seller ID provided - seller associations will be skipped`)
      }

      if (input.transactionId) {
        logger.info(`📄 [PRODUCT_ENHANCEMENTS] Transaction ID: "${input.transactionId}"`)
      }

      // Log products being enhanced
      input.products.forEach((product, index) => {
        logger.info(`📦 [PRODUCT_ENHANCEMENTS] Product ${index + 1}/${input.products.length}: "${product.handle}" (ID: ${product.id})`)
      })
    })

    // Process all enhancements in parallel (brands, attributes, configurations, seller, seller-inventory - 5 in total)
    const [brandResults, attributeResults, configurationResults, sellerResults, sellerInventoryResults] = parallelize(
      when({ input }, ({ input }, { container }) => {
        const logger = container.resolve("logger")
        const hasProductBrands = !!(input.productBrandMappings?.length)

        if (hasProductBrands) {
          logger.info(`🔍 [PRODUCT_ENHANCEMENTS] Per-product brand associations: ${input.productBrandMappings!.length} mappings`)
          return true
        } else {
          logger.info(`🔍 [PRODUCT_ENHANCEMENTS] No brand associations to process`)
          return false
        }
      }).then(() =>
        createBatchBrandAssociationsStep(
          transform({ input }, ({ input }) => ({
            productBrandMappings: input.productBrandMappings!,
            transactionId: input.transactionId || "create-enhancements"
          }))
        )
      ),
      when({ input }, ({ input }) =>
        !!(input.attributeAssignments?.length)
      ).then(() =>
        createProductAttributesStep(
          transform({ input }, ({ input }) => ({
            products: input.products,
            attributeAssignments: input.attributeAssignments!,
            transactionId: input.transactionId || "create-enhancements"
          }))
        )
      ),
      when({ input }, ({ input }) =>
        !!(input.productConfigurations?.length)
      ).then(() =>
        createProductConfigurationsStep(
          transform({ input }, ({ input }) => ({
            products: input.products,
            productConfigurations: input.productConfigurations!,
            transactionId: input.transactionId || "create-enhancements"
          }))
        )
      ),
      when({ input }, ({ input }) =>
        !!(input.sellerId)
      ).then(() =>
        createSellerAssociationsStep(
          transform({ input }, ({ input }) => ({
            products: input.products,
            sellerId: input.sellerId!,
            transactionId: input.transactionId || "create-enhancements"
          }))
        )
      ),
      // Upsert seller-inventory item associations
      when({ input }, ({ input }, { container }) => {
        const logger = container.resolve("logger")
        const hasSellerId = !!(input.sellerId)
        if (hasSellerId) {
          logger.info(`🔗 [PRODUCT_ENHANCEMENTS] Creating seller-inventory associations for seller: ${input.sellerId}`)
          return true
        }
        return false
      }).then(() =>
        upsertSellerInventoryAssociationsStep(
          transform({ input }, ({ input }) => ({
            products: input.products,
            sellerId: input.sellerId!,
            transactionId: input.transactionId || "create-enhancements"
          }))
        )
      )
    )

    // Process publish image jobs after all parallel steps complete
    const publishImageJobsResult = when({ input }, ({ input }, { container }) => {
      const logger = container.resolve("logger")
      const hasPendingImages = !!(input.pendingImages && Object.keys(input.pendingImages).length > 0)
      if (hasPendingImages) {
        const imageCount = Object.values(input.pendingImages!).reduce((sum, { urls }) => sum + urls.length, 0)
        logger.info(`🖼️ [PRODUCT_ENHANCEMENTS] Pending images: ${imageCount} total across ${Object.keys(input.pendingImages!).length} products`)
        return true
      }
      return false
    }).then(() =>
      publishImageJobsStep(
        transform({ input }, ({ input }, { container }) => {
          const logger = container.resolve("logger")

          const productsWithImages = input.products
            .filter(p => input.pendingImages?.[p.handle])
            .map(p => {
              const imageData = input.pendingImages![p.handle]
              logger.info(`📤 [PRODUCT_ENHANCEMENTS] Preparing SQS job for ${p.handle}: ${imageData.urls.length} images, target status: ${imageData.targetStatus}`)
              return {
                id: p.id,
                _pending_images: imageData.urls,
                _target_status: imageData.targetStatus
              }
            })

          return { products: productsWithImages }
        })
      )
    )

    return new WorkflowResponse({
      brandResults,
      attributeResults,
      configurationResults,
      sellerResults,
      sellerInventoryResults,
      publishImageJobsResult
    })
  }
)