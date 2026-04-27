import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"

import { RequestEvents } from "../../../shared/events/request-events"

export interface AcceptPriceListRequestBackgroundInput {
  request_id: string
  reviewer_id: string
  reviewer_note: string
  user_id?: string
  transaction_id: string
  channel?: string
}

const triggerAcceptPriceListRequestBackgroundStep = createStep(
  "trigger-accept-price-list-request-background",
  async (input: AcceptPriceListRequestBackgroundInput, { container }) => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    const channel = input.channel || "vendor_feed"

    await eventBus.emit({
      name: RequestEvents.PRICE_LIST_ACCEPT_PROCESS_BACKGROUND,
      data: {
        request_id: input.request_id,
        reviewer_id: input.reviewer_id,
        reviewer_note: input.reviewer_note,
        user_id: input.user_id || input.reviewer_id,
        transaction_id: input.transaction_id,
        notification: {
          to: input.user_id || input.reviewer_id,
          channel,
          template: "admin-ui",
        },
        redirectNotification: "/admin/price-list-requests",
      },
    })

    return new StepResponse({
      request_id: input.request_id,
      transaction_id: input.transaction_id,
      status: "processing",
      message:
        "Price list request accept started in background. You will be notified when it completes.",
    })
  }
)

export const acceptPriceListRequestBackgroundWorkflow = createWorkflow(
  "accept-price-list-request-background",
  function (input: AcceptPriceListRequestBackgroundInput) {
    const result = triggerAcceptPriceListRequestBackgroundStep(input)
    return new WorkflowResponse(result)
  }
)
