import {
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateProductConfigurationsStep } from "../steps/update-product-configurations"

type UpdateProductConfigurationsWorkflowInput = {
  productConfigurations: Array<{ productId: string; config: Record<string, any> }>
}

export const updateProductConfigurationsWorkflow = createWorkflow(
  "update-product-configurations-workflow",
  (input: WorkflowData<UpdateProductConfigurationsWorkflowInput>) => {
    const result = updateProductConfigurationsStep(input)
    return new WorkflowResponse(result)
  }
)
