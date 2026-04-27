import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { initializeCsvFileStreamStep, finalizeCsvFileStreamStep } from "../steps/csv-file-stream-manager"
import { getProductVariantFeedItemsStep } from "../steps/get-product-variant-feed-items"

type GenerateProductVariantFeedInput = {
  loop?: number
  page_size?: number
}

// Default headers for product variant feed (matches ALL_COLUMNS order)
const DEFAULT_HEADERS = [
  "id",
  "item_group_id",
  "sku",
  "title",
  "description",
  "condition",
  "link",
  "image_link",
  "additional_image_link",
  "additional_image_link",
  "additional_image_link",
  "additional_image_link",
  "availability",
  "price",
  "sale_price",
  "brand",
  "gender",
  "custom label 0",
  "product_type",
  "identifier exists",
  "gtin",
  "color",
  "size",
]

export const generateProductVariantFeedWorkflow = createWorkflow(
  "generate-product-variant-feed",
  (input: GenerateProductVariantFeedInput = {}) => {
    // Initialize CSV file with headers
    const { filePath: initialFilePath } = initializeCsvFileStreamStep({
      headers: DEFAULT_HEADERS,
    })

    // Fetch data and write CSV rows during batch processing
    const { filePath, rowCount } = getProductVariantFeedItemsStep({
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

export default generateProductVariantFeedWorkflow
