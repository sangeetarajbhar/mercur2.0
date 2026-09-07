import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"
import { createCustomerBankDetailStep } from "../steps"

export type CreateCustomerBankDetailInputWorkflow = {
  verified_by: string
  customer_bank_account_verification_id: string
  account_number: string
  ifsc_code: string
  account_holder_name: string
  bank_name: string | null
  status: string
  metadata: Record<string, any> | null
  created_by: string
  updated_by: null
}

export const createCustomerBankDetailWorkflow = createWorkflow(
  { name: "create-customer-bank-detail-workflow" },
  (input: CreateCustomerBankDetailInputWorkflow) => {
    const customerBankDetail = createCustomerBankDetailStep(input)
    return new WorkflowResponse(customerBankDetail)
  }
)
