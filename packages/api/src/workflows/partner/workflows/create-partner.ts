import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createPartnerStep } from "../steps"

type CreatePartnerWorkflowInput = {
  name: string
  status: string
  metadata?: string | null
}

export const createPartnerWorkflow = createWorkflow(
  "create-partner",
  (input: CreatePartnerWorkflowInput) => {
    const partner = createPartnerStep(input)

    return new WorkflowResponse(partner)
  }
)
