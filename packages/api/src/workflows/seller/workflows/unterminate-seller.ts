import {
  createHook,
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep, emitEventStep } from "@medusajs/medusa/core-flows"
import { SellerStatus } from "@mercurjs/types"

import { validateUnterminateSellerStep, updateSellersStep } from "../steps"
import { SellerWorkflowEvents } from "@mercurjs/core-plugin/workflows"

export const unterminateSellerWorkflowId = "unterminate-seller-v2"

type UnterminateSellerWorkflowInput = {
  seller_id: string
}

export const unterminateSellerWorkflow = createWorkflow(
  unterminateSellerWorkflowId,
  function (input: UnterminateSellerWorkflowInput) {
    const { data: seller } = useQueryGraphStep({
      entity: "seller",
      fields: ["id", "status"],
      filters: { id: input.seller_id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-seller" })

    const sellerStatus = transform(
      { seller: seller as any },
      (data) => data.seller?.[0]?.status as SellerStatus
    )

    validateUnterminateSellerStep({ seller: { status: sellerStatus } })

    const updateInput = transform({ input }, ({ input }) => ({
      selector: { id: input.seller_id },
      update: {
        status: SellerStatus.SUSPENDED,
        status_reason: null,
      },
    }))

    updateSellersStep(updateInput)

    emitEventStep({
      eventName: SellerWorkflowEvents.UNTERMINATED,
      data: { id: input.seller_id },
    })

    const sellerUnterminated = createHook("sellerUnterminated", {
      seller_id: input.seller_id,
    })

    return new WorkflowResponse(void 0, { hooks: [sellerUnterminated] })
  }
)
