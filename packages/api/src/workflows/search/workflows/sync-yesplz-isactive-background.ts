import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { YesPlzEvents } from "../../../shared/events/yesplz-events"

export interface YesPlzMarkInactiveBackgroundInput {
  user_id: string
  transaction_id: string
  products: Array<{ pid: string; status: boolean }>
  channel?: string
}

const triggerYesPlzIsActiveSyncBackgroundStep = createStep(
  "trigger-yesplz-isactive-sync-background",
  async (input: YesPlzMarkInactiveBackgroundInput, { container }) => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    const channel = input.channel || "feed"

    await eventBus.emit({
      name: YesPlzEvents.MARK_INACTIVE_PROCESS_BACKGROUND,
      data: {
        transaction_id: input.transaction_id,
        user_id: input.user_id,
        products: input.products,
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
        "Update isActive started in background. You will be notified when it completes.",
    })
  }
)

export const syncYesPlzMarkInactiveBackgroundWorkflow = createWorkflow(
  "sync-yesplz-mark-inactive-background",
  function (input: YesPlzMarkInactiveBackgroundInput) {
    const result = triggerYesPlzIsActiveSyncBackgroundStep(input)
    return new WorkflowResponse(result)
  }
)
