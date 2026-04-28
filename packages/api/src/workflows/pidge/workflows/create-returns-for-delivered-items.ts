import { WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { createReturnsForDeliveredItemsStep, CreateReturnsForDeliveredItemsInput } from '../steps/create-returns-for-delivered-items'

export const createReturnsForDeliveredItemsWorkflow = createWorkflow(
  'create-returns-for-delivered-items-workflow',
  function (input: CreateReturnsForDeliveredItemsInput) {
    const result = createReturnsForDeliveredItemsStep(input)
    return new WorkflowResponse(result)
  }
)
