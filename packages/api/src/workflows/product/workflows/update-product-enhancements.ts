import { createWorkflow, WorkflowResponse, WorkflowData, when, parallelize, transform } from "@medusajs/framework/workflows-sdk"
import { updateProductAttributesStep } from "../steps/update-product-attributes"
import { updateProductConfigurationsStep } from "../steps/update-product-configurations"
import { createBatchBrandAssociationsStep } from "../steps/create-batch-brand-associations"
import { publishImageJobsStep } from "../steps/publish-image-jobs"
import { upsertSellerInventoryAssociationsStep } from "../steps/upsert-seller-inventory-associations"
import { syncVariantInventorySkuStep } from "../steps/sync-variant-inventory-sku"

/**
 * Input for updating product enhancements - matches create workflow structure
 */
export interface UpdateProductEnhancementsWorkflowInput {
  /**
   * The products to update
   */
  products: Array<{ id: string; handle?: string; thumbnail?: string | null }>
  /**
   * Attribute assignments for products
   */
  attributeAssignments?: Array<{
    productId: string
    attributes: Array<{ name: string; value: string; attribute_id: string }>
  }>
  /**
   * Configuration assignments for products
   */
  productConfigurations?: Array<{
    productId: string
    config: Record<string, any>
  }>
  /**
   * Per-product brand mappings for updates
   */
  productBrandMappings?: Array<{
    productId: string
    productHandle: string
    brandName: string
  }>
  /**
   * Seller ID for associations (required for seller-inventory updates)
   */
  sellerId: string
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

export const updateProductEnhancementsWorkflow = createWorkflow(
  "update-product-enhancements",
  (input: WorkflowData<UpdateProductEnhancementsWorkflowInput>) => {
    // Log workflow start
    transform({ input }, ({ input }, { container }) => {
      const logger = container.resolve("logger")
      logger.info(`[Enhanced Import] Starting updateProductEnhancementsWorkflow for ${input.products.length} products`)
      logger.info(`[Enhanced Import] Input summary: productCount=${input.products.length}, hasAttributes=${!!(input.attributeAssignments?.length)}, hasConfigurations=${!!(input.productConfigurations?.length)}, hasBrands=${!!(input.productBrandMappings?.length)}, hasPendingImages=${!!(input.pendingImages && Object.keys(input.pendingImages).length > 0)}, sellerId=${input.sellerId}, transactionId=${input.transactionId}`)
      return input
    })

    // Process all enhancements in parallel (brands, attributes, configurations, seller-inventory - images moved outside)
    const [brandResults, attributeResults, configurationResults, sellerInventoryResults, skuSyncResults] = parallelize(
      when({ input }, ({ input }, { container }) => {
        const logger = container.resolve("logger")
        const hasBrands = !!(input.productBrandMappings?.length)
        if (hasBrands) {
          logger.info(`🔍 [UPDATE_ENHANCEMENTS] Processing ${input.productBrandMappings!.length} brand associations for updates`)
        } else {
          logger.info(`🔍 [UPDATE_ENHANCEMENTS] No brand associations to process`)
        }
        return hasBrands
      }).then(() =>
        createBatchBrandAssociationsStep(
          transform({ input }, ({ input }) => ({
            productBrandMappings: input.productBrandMappings!,
            transactionId: input.transactionId || "update-enhancements"
          }))
        )
      ),
      when({ input }, ({ input }) =>
        !!(input.attributeAssignments?.length)
      ).then(() =>
        updateProductAttributesStep({
          products: input.products,
          attributeAssignments: input.attributeAssignments!
        })
      ),
      when({ input }, ({ input }) =>
        !!(input.productConfigurations?.length)
      ).then(() =>
        updateProductConfigurationsStep({
          productConfigurations: input.productConfigurations!
        })
      ),

      // Upsert seller-inventory item associations
      when({ input }, ({ input }, { container }) => {
        const logger = container.resolve("logger")
        const hasSellerId = !!(input.sellerId)
        if (hasSellerId) {
          logger.info(`🔗 [UPDATE_ENHANCEMENTS] Upserting seller-inventory associations for seller: ${input.sellerId}`)
          return true
        }
        return false
      }).then(() =>
        upsertSellerInventoryAssociationsStep(
          transform({ input }, ({ input }) => ({
            products: input.products,
            sellerId: input.sellerId!,
            transactionId: input.transactionId || "update-enhancements"
          }))
        )
      ),

      // Sync variant SKU changes to linked inventory items
      syncVariantInventorySkuStep(
        transform({ input }, ({ input }) => ({
          products: input.products
        }))
      )
    )

    // Process publish image jobs after all parallel steps complete
    const publishImageJobsResult = when({ input }, ({ input }, { container }) => {
      const logger = container.resolve("logger")
      const hasPendingImages = !!(input.pendingImages && Object.keys(input.pendingImages).length > 0)
      if (hasPendingImages) {
        const imageCount = Object.values(input.pendingImages!).reduce((sum, { urls }) => sum + urls.length, 0)
        logger.info(`🖼️ [UPDATE_ENHANCEMENTS] Pending images: ${imageCount} total across ${Object.keys(input.pendingImages!).length} products`)
        return true
      }
      return false
    }).then(() =>
      publishImageJobsStep(
        transform({ input }, ({ input }, { container }) => {
          const logger = container.resolve("logger")

          const productsWithImages = input.products
            .filter(p => p.id && input.pendingImages?.[p.id])
            .map(p => {
              const imageData = input.pendingImages![p.id!]
              logger.info(`📤 [UPDATE_ENHANCEMENTS] Preparing SQS job for ${p.id}: ${imageData.urls.length} images, target status: ${imageData.targetStatus}`)
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
      sellerInventoryResults,
      skuSyncResults,
      publishImageJobsResult
    })
  }
)
