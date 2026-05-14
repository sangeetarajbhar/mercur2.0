import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"

import { updateReviewStep } from "../steps"

type UpdateReviewDTO = {
  id: string
  seller_note?: string
}

export const updateReviewWorkflow = createWorkflow(
  {
    name: "update-review",
  },
  function (input: UpdateReviewDTO) {
    const review = updateReviewStep(input)
    return new WorkflowResponse(review)
  }
)

