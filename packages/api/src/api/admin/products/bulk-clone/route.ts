import { Request as MedusaRequest, Response as MedusaResponse } from "express"
import { z } from "zod"
import { Modules } from "@medusajs/framework/utils"
import { acceptProductCloneRequestWorkflow } from "../../../../workflows/requests/workflows/accept-product-clone-request"

type ProductService = any
type InventoryService = any
type ProductVariant = { id: string; inventory_item_id?: string }
type InventoryItem = { id: string }

const BulkCloneSchema = z.object({
  target_seller_id: z.string(),
  product_ids: z.array(z.string()),
})

/**
 * Process the bulk clone job
 */
async function processBulkCloneJob(req: MedusaRequest, jobId: string, productIds: string[], targetSellerId: string) {
  try {
    // Update job status to processing
    global.bulkCloneJobs[jobId].status = "processing"
    global.bulkCloneJobs[jobId].progress = 0
    global.bulkCloneJobs[jobId].updated_at = new Date()

    const results = { successful: [] as string[], failed: [] as { id: string; error: string }[] }
    const productService = req.scope.resolve(Modules.PRODUCT) as ProductService
    const inventoryService = req.scope.resolve(Modules.INVENTORY) as InventoryService
    const batchSize = 100

    for (let i = 0; i < productIds.length; i += batchSize) {
      const batchIds = productIds.slice(i, i + batchSize)
      global.bulkCloneJobs[jobId].progress = Math.round((i / productIds.length) * 100)
      global.bulkCloneJobs[jobId].updated_at = new Date()

      const productLinks: Array<{ id: string }> = []
      const inventoryItemLinks: Array<{ id: string }> = []

      for (const productId of batchIds) {
        try {
          productLinks.push({ id: productId })

          const variants = await productService.listProductVariants({
            product_id: productId,
          }) as ProductVariant[]

          const inventoryItemIds = variants
            .map(v => v.inventory_item_id)
            .filter((id): id is string => Boolean(id))

          if (inventoryItemIds.length > 0) {
            const inventoryItems = await inventoryService.listInventoryItems({
              id: inventoryItemIds,
            }) as InventoryItem[]

            for (const item of inventoryItems) {
              inventoryItemLinks.push({ id: item.id })
            }
          }
        } catch (err) {
          console.error(`Error processing product ${productId}:`, err)
          results.failed.push({
            id: productId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      if (productLinks.length > 0) {
        try {
          const { result } = await acceptProductCloneRequestWorkflow.run({
            container: req.scope,
            input: {
              target_seller_id: targetSellerId,
              productLinks,
              inventoryItemLinks,
            },
          })

          for (const productLink of productLinks) {
            if (!results.failed.some((f) => f.id === productLink.id)) {
              results.successful.push(productLink.id)
            }
          }
        } catch (err) {
          console.error(`Error running workflow for batch:`, err)
          for (const productLink of productLinks) {
            if (!results.failed.some((f) => f.id === productLink.id)) {
              results.failed.push({
                id: productLink.id,
                error: err instanceof Error ? err.message : String(err),
              })
            }
          }
        }
      }
    }

    global.bulkCloneJobs[jobId].status = "completed"
    global.bulkCloneJobs[jobId].progress = 100
    global.bulkCloneJobs[jobId].updated_at = new Date()
    global.bulkCloneJobs[jobId].result = {
      successful: results.successful,
      failed: results.failed,
      failedItems: results.failed,
      successful_count: results.successful.length,
      failed_count: results.failed.length
    }
  } catch (err) {
    console.error("Bulk clone processing error:", err)
    global.bulkCloneJobs[jobId].status = "failed"
    global.bulkCloneJobs[jobId].updated_at = new Date()
    global.bulkCloneJobs[jobId].result = {
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {

    console.log('Bulk clone request received >>>>>>>>>>>>>>>>>>>>>', req.body)
    const validationResult = BulkCloneSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationResult.error.errors,
        success: false,
      })
    }

    const validated = validationResult.data
    const jobId = `bulk_clone_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    if (!global.bulkCloneJobs) {
      global.bulkCloneJobs = {}
    }

    global.bulkCloneJobs[jobId] = {
      id: jobId,
      status: "created",
      progress: 0,
      result: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    // Process the job in the background
    setTimeout(() => {
      processBulkCloneJob(req, jobId, validated.product_ids, validated.target_seller_id)
    }, 100)

    return res.status(200).json({
      message: "Bulk clone job started",
      job_id: jobId,
      success: true,
    })
  } catch (error) {
    console.error("Error starting bulk clone job:", error)
    return res.status(500).json({
      message: `Error starting bulk clone job: ${error instanceof Error ? error.message : String(error)}`,
      success: false,
    })
  }
}
