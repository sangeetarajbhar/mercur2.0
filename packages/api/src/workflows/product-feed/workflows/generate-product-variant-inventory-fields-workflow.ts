import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { initializeCsvFileStreamStep, finalizeCsvFileStreamStep } from "../steps/csv-file-stream-manager"
import { getProductVariantInventoryFeedItemsStep } from "../steps/get-product-variant-inventory-feed-items"

// Headers for inventory feed CSV
const INVENTORY_HEADERS = [
  "id",
  "region_id",
  "availability",
]

type GenerateProductVariantInventoryFeedInput = {
  loop?: number
  page_size?: number
}

export const generateProductVariantInventoryFeedWorkflow = createWorkflow(
  "generate-product-variant-inventory-feed",
  (input: GenerateProductVariantInventoryFeedInput = {}) => {
    // Initialize CSV file with headers
    const { filePath: initialFilePath } = initializeCsvFileStreamStep({
      headers: INVENTORY_HEADERS,
    })

    // Fetch data and write CSV rows during batch processing
    const { filePath, rowCount } = getProductVariantInventoryFeedItemsStep({
      filePath: initialFilePath,
      loop: input.loop,
      page_size: input.page_size,
    })

    // Finalize the CSV file stream
    const { filePath: finalFilePath } = finalizeCsvFileStreamStep({
      filePath,
    })

    return new WorkflowResponse({
      filePath: finalFilePath,
      rowCount,
    })
  }
)

export default generateProductVariantInventoryFeedWorkflow
