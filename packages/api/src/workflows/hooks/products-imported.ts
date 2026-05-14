import { Modules } from '@medusajs/framework/utils'
import { StepResponse } from '@medusajs/framework/workflows-sdk'

import { ProductEvents } from '../../shared/events/product-events'
import { createProductEnhancementsWorkflow } from "../product/workflows/create-product-enhancements"
import { enhancedBatchProductsWorkflow } from "../product/workflows/enhanced-import/enhanced-batch-products-workflow"

/**
 * Enhanced import data structure passed via additional_data
 */
export interface EnhancedImportData {
  attributes?: Record<string, Array<{ handle: string; value: string }>>
  configurations?: Record<string, any>
  sizeCharts?: Record<string, any>
  brands?: Record<string, string> // productHandle -> brandName mapping
  imageUrls?: Record<string, string[]> // productHandle -> image URLs mapping
  targetStatus?: Record<string, string> // productHandle -> target status mapping
  transactionId: string
  sellerId: string
}

/**
 * Runtime shape of each created product passed into the productsImported hook.
 * The full ProductDTO is provided at runtime, but the handler only needs
 * id/handle/thumbnail. We declare it explicitly because the hook input type
 * inferred from `createHook` can leak `WorkflowData` wrappers.
 */
type ImportedProductRef = {
  id: string
  handle: string
  thumbnail?: string | null
}

/**
 * Hook listener for products imported through enhancedBatchProductsWorkflow.
 *
 * This was previously registered on `createProductsWorkflow.hooks.productsCreated`,
 * but that core hook is also registered by other packages (node_modules) and a
 * given workflow hook can only have a single registration. By exposing a custom
 * `productsImported` hook on `enhancedBatchProductsWorkflow`, this enhancement
 * logic now runs ONLY when products are imported via the enhanced batch
 * workflow, not on every product creation.
 */
enhancedBatchProductsWorkflow.hooks.productsImported(
  async (input, { container }) => {
    // Narrow the hook input to its concrete runtime shape. The auto-inferred
    // type from `createHook` wraps step outputs in `WorkflowData<>`, which
    // breaks downstream `.map`/property access in the handler.
    const products = (input.products ?? []) as ImportedProductRef[]
    const additional_data = input.additional_data as
      | EnhancedImportData
      | undefined

    const logger = container.resolve("logger")
    logger.info("[Enhanced Import Hook] productsImported hook triggered")
    logger.info(`[Enhanced Import Hook] Created products count: ${products.length}`)
    logger.info(`[Enhanced Import Hook] Received additional_data keys: ${Object.keys(additional_data || {}).join(', ')}`)
    if (additional_data) {
      logger.info(`[Enhanced Import Hook] TransactionId: ${additional_data.transactionId}`)
      logger.info(`[Enhanced Import Hook] Additional data: ${JSON.stringify(additional_data)}`)
    }

    // No products were created in this batch (e.g. update/delete-only chunk) — nothing to do
    if (!products.length) {
      return new StepResponse({})
    }

    // --- Enhanced Import Logic Start ---
    if (additional_data) {
      const enhancedData = additional_data

      logger.info(`[Enhanced Import Hook] Processing enhancements for ${products.length} created products`)

      // Prepare attribute assignments
      const attributeAssignments = Object.entries(enhancedData.attributes || {}).map(([productHandle, attrs]) => ({
        productHandle,
        attributes: attrs.map(attr => ({ name: attr.handle, value: attr.value }))
      }))

      // Prepare configuration assignments
      const productConfigurations = Object.entries(enhancedData.configurations || {}).map(([productHandle, config]) => ({
        productHandle,
        config
      }))

      // Prepare brand mappings
      const productBrandMappings = enhancedData.brands ? products.map((product) => ({
          productId: product.id,
          productHandle: product.handle,
          brandName: enhancedData.brands![product.handle]
        }))
        .filter(mapping => mapping.brandName) : undefined

      // Run enhancement workflow with all data (brands, attributes, configurations, images)
      const hasAttributes = attributeAssignments.length > 0
      const hasConfigurations = productConfigurations.length > 0
      const hasBrands = !!(productBrandMappings?.length)

      // Extract pending images data from additional_data (from chunk processing)
      const pendingImages = products.reduce((acc, product) => {
        const urls = enhancedData.imageUrls?.[product.handle]
        const targetStatus = enhancedData.targetStatus?.[product.handle]

        if (urls?.length) {
          acc[product.handle] = {
            urls,
            targetStatus: targetStatus || 'draft'  // Fallback to draft if not specified
          }
          logger.info(`[Enhanced Import Hook] Product ${product.handle} has ${urls.length} pending images, target status: ${targetStatus || 'draft'}`)
        }
        return acc
      }, {} as Record<string, { urls: string[]; targetStatus: string }>)

      const hasPendingImages = Object.keys(pendingImages).length > 0

      logger.info(`[Enhanced Import Hook] Enhancement summary: ${hasAttributes ? 'attributes, ' : ''}${hasConfigurations ? 'configurations, ' : ''}${hasBrands ? 'brands, ' : ''}${hasPendingImages ? 'images' : ''} found`)

      if (hasAttributes || hasConfigurations || hasBrands || hasPendingImages) {
        // NO TRY/CATCH - Let errors propagate to trigger workflow rollback
        // This ensures that if enhancements fail, the entire workflow fails and compensates
        await createProductEnhancementsWorkflow(container).run({
          input: {
            products: products.map(p => ({ id: p.id, handle: p.handle, thumbnail: p.thumbnail })),
            attributeAssignments: hasAttributes ? attributeAssignments : undefined,
            productConfigurations: hasConfigurations ? productConfigurations : undefined,
            productBrandMappings: hasBrands ? productBrandMappings : undefined,
            sellerId: enhancedData.sellerId,
            transactionId: enhancedData.transactionId,
            pendingImages: hasPendingImages ? pendingImages : undefined
          }
        })

        logger.info(`[Enhanced Import Hook] ✅ Enhancement processing completed for ${products.length} products`)
      }
    }

    // Emit generic product sync event (both Algolia and YesPlz listen to this)
    await container.resolve(Modules.EVENT_BUS).emit({
      name: ProductEvents.PRODUCTS_CHANGED,
      data: { ids: products.map((product) => product.id) }
    })

    return new StepResponse({})
  }
)
