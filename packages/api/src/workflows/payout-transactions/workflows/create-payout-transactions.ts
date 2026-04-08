import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createPayoutTransactionsStep, CreatePayoutTransactionsStepInput } from "../steps"

export const createPayoutTransactionsWorkflow = createWorkflow(
  "create-payout-transaction-workflow",
  (input: CreatePayoutTransactionsStepInput) => {
    const payoutTransactions = createPayoutTransactionsStep(input)
    return new WorkflowResponse(payoutTransactions)
  }
)
