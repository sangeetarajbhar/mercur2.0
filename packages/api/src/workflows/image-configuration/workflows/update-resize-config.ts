import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { IMAGE_CONFIGURATION_MODULE } from "../../../modules/image-configuration"
import ImageConfigurationModuleService from "../../../modules/image-configuration/service"

const updateResizeConfigStep = createStep(
  "update-resize-config-step",
  async (input: Record<string, any>, { container }) => {
    const service = container.resolve<ImageConfigurationModuleService>(IMAGE_CONFIGURATION_MODULE)
    const result = await service.updateResizeConfigs(input as any)
    return new StepResponse(result)
  }
)

export const updateResizeConfigWorkflow = createWorkflow("update-resize-config", (input: Record<string, any>) => {
  const result = updateResizeConfigStep(input)
  return new WorkflowResponse(result)
})
