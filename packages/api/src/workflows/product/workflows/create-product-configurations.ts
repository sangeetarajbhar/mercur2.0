import {
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createProductConfigurationsStep,
  CreateProductConfigurationsStepInput,
} from "../steps/create-product-configurations"

export const createProductConfigurationsWorkflow = createWorkflow(
  "create-product-configurations-workflow",
  (input: WorkflowData<CreateProductConfigurationsStepInput>) => {
    const result = createProductConfigurationsStep(input)
    return new WorkflowResponse(result)
  }
)
