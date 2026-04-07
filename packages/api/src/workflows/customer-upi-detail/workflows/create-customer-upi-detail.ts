import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"
import { createCustomerUpiDetailStep } from "../steps"

export type CreateCustomerUpiDetailInputWorkflow = {
  verified_by: string
  customer_bank_account_verification_id: string
  upi_id: string
  status: string
  metadata: Record<string, any> | null
  created_by: string
  updated_by: null
}

export const createCustomerUpiDetailWorkflow = createWorkflow(
  { name: "create-customer-upi-detail-workflow" },
  (input: CreateCustomerUpiDetailInputWorkflow) => {
    const customerUpiDetail = createCustomerUpiDetailStep(input)
    return new WorkflowResponse(customerUpiDetail)
  }
)
