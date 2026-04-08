import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"
import { customerRefundMethodByIdStep } from "../steps"

export const customerRefundMethodByIdWorkflow = createWorkflow(
  { name: "customer-refund-method-by-id-workflow" },
  (input: { id: string }) => {
    const result = customerRefundMethodByIdStep(input)
    return new WorkflowResponse(result)
  }
)
