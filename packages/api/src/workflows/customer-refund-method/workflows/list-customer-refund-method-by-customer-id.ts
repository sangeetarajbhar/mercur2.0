import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"
import { listCustomerRefundMethodByCustomerIdStep } from "../steps"

export const listCustomerRefundMethodByCustomerId = createWorkflow(
  { name: "list-customer-refund-method-by-customer-id-workflow" },
  (input: { customer_id: string; status: boolean }) => {
    const result = listCustomerRefundMethodByCustomerIdStep(input)
    return new WorkflowResponse(result)
  }
)
