import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  beginReceiveReturnWorkflow,
  receiveItemReturnRequestWorkflow,
} from "@medusajs/medusa/core-flows"
import { confirmReceiveReturnWorkflow } from "../workflows/confirm-receive-return"
import { Modules } from "@medusajs/framework/utils"

export interface ReceiveReturnItemsInput {
  return_id: string
  items: Array<{
    id: string
    quantity: number
  }>
  confirmed_by: string
  filterableFields?: any
  queryConfigFields?: string[]
}

export interface ReceiveReturnItemsOutput {
  order_preview: any
  return: any
}

export const receiveReturnItemsStep = createStep(
  "receive-return-items",
  async (
    input: ReceiveReturnItemsInput,
    { container }
  ): Promise<StepResponse<ReceiveReturnItemsOutput>> => {
    const { return_id, items, confirmed_by, filterableFields, queryConfigFields } = input

    // Step 1: Begin receive return workflow
    try {
      await beginReceiveReturnWorkflow(container).run({
        input: {
          return_id,
        },
      })
    } catch (error) {
      // If workflow fails (e.g., already begun), log but continue
      console.error("beginReceiveReturnWorkflow failed:", error)
    }

    // Step 2: Receive items workflow
    await receiveItemReturnRequestWorkflow(container).run({
      input: {
        items,
        return_id,
      },
    })

    // Step 3: Confirm receive return workflow
    const { result } = await confirmReceiveReturnWorkflow(container).run({
      input: {
        return_id,
        confirmed_by,
        filterableFields,
        queryConfigFields,
      },
    })

    // Emit return_items_received event
    const eventBus = container.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "return_items_received",
      data: {
        return_id,
      },
    })

    return new StepResponse({
      order_preview: result.order_preview,
      return: result.return,
    })
  }
)
