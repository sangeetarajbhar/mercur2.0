import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { enhancedBatchProductsWorkflow } from "../../workflows/enhanced-import/enhanced-batch-products-workflow"

export const enhancedProcessImportChunksStepId = "enhanced-process-import-chunks"

type ProcessChunksResult = {
  success: boolean
  completed: boolean
  successfulChunks: number
  totalProductsProcessed: number
  totalChunks: number
  error?: string
}


/**
 * Extracts enhancement data from a single product item
 */
function extractEnhancementData(item: any): {
  itemKey: string | null
  attributes?: any[]
  configuration?: any
  sizeChart?: any
  brand?: string
  imageUrls?: string[]
  targetStatus?: string
} {
  if (!item.additional_data) {
    return { itemKey: null }
  }

  const itemKey = item.handle || item.id
  if (!itemKey) {
    return { itemKey: null }
  }

  const result: any = { itemKey }

  if (item.additional_data.attributes) {
    result.attributes = item.additional_data.attributes.map((attr: any) => ({
      handle: attr.name,
      value: attr.value,
      attribute_id: attr.attribute_id
    }))
  }

  if (item.additional_data.configuration) {
    result.configuration = item.additional_data.configuration
  }

  if (item.additional_data.sizeChart) {
    result.sizeChart = item.additional_data.sizeChart
  }

  if (item.additional_data.brand) {
    result.brand = item.additional_data.brand
  }

  if (item.additional_data.imageUrls) {
    result.imageUrls = item.additional_data.imageUrls
  }

  if (item.additional_data.targetStatus) {
    result.targetStatus = item.additional_data.targetStatus
  }

  return result
}

/**
 * Aggregates enhancement data from all items in chunk
 */
function aggregateEnhancementData(chunkData: any): {
  attributes: Record<string, any>
  configurations: Record<string, any>
  sizeCharts: Record<string, any>
  brands: Record<string, string> // Map of productHandle -> brandName
  imageUrls: Record<string, string[]>
  targetStatus: Record<string, string>
} {
  const attributes: Record<string, any> = {}
  const configurations: Record<string, any> = {}
  const sizeCharts: Record<string, any> = {}
  const brands: Record<string, string> = {}

  const imageUrls: Record<string, string[]> = {}
  const targetStatus: Record<string, string> = {}

  const processItems = (items: any[]) => {
    items?.forEach(item => {
      const enhancement = extractEnhancementData(item)
      if (enhancement.itemKey) {
        if (enhancement.attributes) {
          attributes[enhancement.itemKey] = enhancement.attributes
        }
        if (enhancement.configuration) {
          configurations[enhancement.itemKey] = enhancement.configuration
        }
        if (enhancement.sizeChart) {
          sizeCharts[enhancement.itemKey] = enhancement.sizeChart
        }
        if (enhancement.brand) {
          brands[enhancement.itemKey] = enhancement.brand
        }
        if (enhancement.imageUrls) {
          imageUrls[enhancement.itemKey] = enhancement.imageUrls
        }
        if (enhancement.targetStatus) {
          targetStatus[enhancement.itemKey] = enhancement.targetStatus
        }
      }
    })
  }

  processItems(chunkData.create)
  processItems(chunkData.update)

  return { attributes, configurations, sizeCharts, brands, imageUrls, targetStatus }
}


/**
 * Enhanced chunk processing step that uses enhancedBatchProductsWorkflow
 *
 * Key Changes from Original:
 * 1. Uses enhancedBatchProductsWorkflow instead of individual create/update/delete workflows
 * 2. Maintains the same parallel execution pattern as original batchProductsWorkflow
 * 3. Passes enhancement data via additional_data to enable hook processing
 * 4. Cleaner code structure following Medusa patterns
 * 5. Better error handling with proper compensation
 */
export const enhancedProcessImportChunksStep = createStep(
  {
    name: enhancedProcessImportChunksStepId,
    async: true
  },
  async (input: { chunks: { id: string }[]; sellerId: string }, { container }) => {
    const file = container.resolve(Modules.FILE)
    const logger = container.resolve("logger")

    let successfulChunks = 0
    let totalProductsProcessed = 0
    let failedChunkIndex: number | null = null
    let capturedError: string | null = null

    try {
      for (let i = 0; i < input.chunks.length; i++) {
        const chunk = input.chunks[i]

        // Read and parse chunk data
        const contents = await file.getAsBuffer(chunk.id)
        const products = JSON.parse(contents.toString("utf-8"))

        const productsInChunk = (products.create?.length || 0) + (products.update?.length || 0)

        logger.info(
          `[Enhanced Import] Processing chunk ${i + 1}/${input.chunks.length} (${chunk.id}) - ` +
          `${productsInChunk} products (${products.create?.length || 0} new, ${products.update?.length || 0} updates)`
        )

        // Extract and aggregate enhancement data from all items
        const { attributes, configurations, sizeCharts, brands, imageUrls, targetStatus } = aggregateEnhancementData(products)

        // Prepare additional_data for workflow
        const additional_data = {
          attributes,
          configurations,
          sizeCharts,
          brands,
          imageUrls,
          targetStatus,
          transactionId: chunk.id,
          sellerId: input.sellerId, // Use camelCase to match workflow interface
        }

        logger.info(
          `[Enhanced Import] Dispatching batch workflow for chunk ${i + 1} - ` +
          `Attributes: ${Object.keys(attributes).length}, ` +
          `Configs: ${Object.keys(configurations).length}, ` +
          `Brands: ${Object.keys(brands).length}, ` +
          `Image URLs: ${Object.keys(imageUrls).length}`
        )

        try {
          // Execute batch workflow with enhancement data
          const result = await enhancedBatchProductsWorkflow(container).run({
            input: {
              create: products.create,
              update: products.update,
              delete: products.delete,
              additional_data
            }
          })

          successfulChunks++
          totalProductsProcessed += productsInChunk

          logger.info(`[Enhanced Import] ✅ Chunk ${i + 1}/${input.chunks.length} completed successfully - ${productsInChunk} products processed`)
        } catch (chunkError: any) {
          // Capture the error message for notification
          failedChunkIndex = i
          capturedError = formatFriendlyErrorMessage(chunkError)
          logger.error(`[Enhanced Import] ❌ Chunk ${i + 1}/${input.chunks.length} failed: ${capturedError}`)
          logger.error(chunkError)
          // Break the loop on first error - don't process remaining chunks
          break
        }
      }

      if (!capturedError) {
        logger.info(`[Enhanced Import] 🎉 All ${input.chunks.length} chunks processed successfully - ${totalProductsProcessed} total products`)
      }

    } finally {
      // Always cleanup chunk files (single cleanup location)
      await file.deleteFiles(input.chunks.map(chunk => chunk.id))

      logger.info(
        `[Enhanced Import] Cleanup completed. ` +
        `Final summary: ${successfulChunks}/${input.chunks.length} chunks successful, ` +
        `${totalProductsProcessed} products processed` +
        (failedChunkIndex !== null ? `, failed at chunk ${failedChunkIndex + 1}` : '')
      )
    }

    // Return failure result if an error was captured
    if (capturedError) {
      return new StepResponse<ProcessChunksResult>({
        success: false,
        completed: true,
        successfulChunks,
        totalProductsProcessed,
        totalChunks: input.chunks.length,
        error: capturedError
      })
    }

    return new StepResponse<ProcessChunksResult>({
      success: true,
      completed: true,
      successfulChunks,
      totalProductsProcessed,
      totalChunks: input.chunks.length
    })
  }
)

/**
 * Formats error messages for user-friendly notifications
 */
function formatFriendlyErrorMessage(error: any): string {
  const msg = error?.message || ""

  // Return the error message as-is if it exists, otherwise provide a generic message
  if (!msg || msg === "Unknown error") {
    return "Import failed. Please check server logs for details."
  }

  return msg
}
