import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { IMAGE_CONFIGURATION_MODULE } from "../../../modules/image-configuration"
import ImageConfigurationModuleService from "../../../modules/image-configuration/service"

const createResizeConfigStep = createStep(
  "create-resize-config-step",
  async (input: Record<string, any>, { container }) => {
    const service = container.resolve<ImageConfigurationModuleService>(IMAGE_CONFIGURATION_MODULE)
    const resizeConfig = await service.createResizeConfigs(input)
    return new StepResponse(resizeConfig)
  }
)

export const createResizeConfigWorkflow = createWorkflow("create-resize-config", (input: Record<string, any>) => {
  const result = createResizeConfigStep(input)
  return new WorkflowResponse(result)
})
