import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"
import { createCustomerPaymentPreferenceStep } from "../steps"

export const createCustomerPaymentPreferenceWorkflow = createWorkflow(
  { name: "create-customer-payment-preference-workflow" },
  (input: Record<string, any>) => {
    const result = createCustomerPaymentPreferenceStep(input)
    return new WorkflowResponse(result)
  }
)
