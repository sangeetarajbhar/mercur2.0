import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { YesPlzEvents } from "../../../shared/events/yesplz-events"

export interface YesPlzScoreSyncBackgroundInput {
  user_id: string
  transaction_id: string
  /** product_id -> final_score, JSON-serializable */
  score_map: Record<string, number>
  parse_errors?: Array<{ product_id: string; error: string }>
  channel?: string
}

const triggerYesPlzScoreSyncBackgroundStep = createStep(
  "trigger-yesplz-score-sync-background",
  async (input: YesPlzScoreSyncBackgroundInput, { container }) => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    const channel = input.channel || "feed"

    await eventBus.emit({
      name: YesPlzEvents.SCORE_SYNC_PROCESS_BACKGROUND,
      data: {
        transaction_id: input.transaction_id,
        user_id: input.user_id,
        score_map: input.score_map,
        parse_errors: input.parse_errors,
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
        "Product scores upload started in background. You will be notified when it completes.",
    })
  }
)

export const syncYesPlzScoresBackgroundWorkflow = createWorkflow(
  "sync-yesplz-scores-background",
  function (input: YesPlzScoreSyncBackgroundInput) {
    const result = triggerYesPlzScoreSyncBackgroundStep(input)
    return new WorkflowResponse(result)
  }
)
