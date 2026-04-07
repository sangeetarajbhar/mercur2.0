import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createPartnerStep } from "../steps"

export const createPartnerWorkflow = createWorkflow("create-partner", (input: { name: string; status: string }) => {
  const partner = createPartnerStep(input)
  return new WorkflowResponse(partner)
})
