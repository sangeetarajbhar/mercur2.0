import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"
import { YesPlzEvents } from "../../../shared/events/yesplz-events"

export interface YesPlzPriceSyncBackgroundInput {
  user_id: string
  transaction_id: string
  product_ids?: string[]
  channel?: string
}

const triggerYesPlzPriceSyncBackgroundStep = createStep(
  "trigger-yesplz-price-sync-background",
  async (input: YesPlzPriceSyncBackgroundInput, { container }) => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    const channel = input.channel || "feed"

    await eventBus.emit({
      name: YesPlzEvents.PRICE_SYNC_PROCESS_BACKGROUND,
      data: {
        transaction_id: input.transaction_id,
        user_id: input.user_id,
        product_ids: input.product_ids,
        notification: {
          to: input.user_id,
          channel,
          template: "admin-ui",
        },
        redirectNotification: "/yesplz",
      },
    })

    return new StepResponse({
      transaction_id: input.transaction_id,
      status: "processing",
      message:
        "Price sync started in background. You will be notified when it completes.",
    })
  }
)

export const syncYesPlzPricesBackgroundWorkflow = createWorkflow(
  "sync-yesplz-prices-background",
  function (input: YesPlzPriceSyncBackgroundInput) {
    const result = triggerYesPlzPriceSyncBackgroundStep(input)
    return new WorkflowResponse(result)
  }
)

