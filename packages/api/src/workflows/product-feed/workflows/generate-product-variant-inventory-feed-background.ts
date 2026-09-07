import {
  StepResponse,
  createStep,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { createWorkflow } from "@medusajs/framework/workflows-sdk"

type BackgroundFeedInput = {
  transaction_id: string
  user_id: string
  loop?: number
  page_size?: number
}

const triggerProductVariantInventoryFeedBackgroundStep = createStep(
  "trigger-product-variant-inventory-feed-background",
  async (input: BackgroundFeedInput, { container }) => {
    const eventBus = container.resolve(Modules.EVENT_BUS)

    await eventBus.emit({
      name: "product-inventory-feed.process-background",
      data: input,
    })

    return new StepResponse({
      transaction_id: input.transaction_id,
      status: "processing",
      message: "Product variant inventory feed export started in background",
    })
  }
)

export const generateProductVariantInventoryFeedBackgroundWorkflow = createWorkflow(
  "generate-product-variant-inventory-feed-background",
  function (input: BackgroundFeedInput) {
    const result = triggerProductVariantInventoryFeedBackgroundStep(input)
    return new WorkflowResponse(result)
  }
)

export default generateProductVariantInventoryFeedBackgroundWorkflow
