import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { REVIEW_MODULE, ReviewModuleService } from "../../../modules/review"

type UpdateReviewDTO = {
  id: string
  seller_note?: string
}

export const updateReviewStep = createStep(
  "update-review",
  async (input: UpdateReviewDTO, { container }) => {
    const service = container.resolve<ReviewModuleService>(REVIEW_MODULE)
    const review = await (service as any).updateReviews(input)
    return new StepResponse(review)
  }
)

