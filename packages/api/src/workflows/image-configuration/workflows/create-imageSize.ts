import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { IMAGE_CONFIGURATION_MODULE } from "../../../modules/image-configuration"
import ImageConfigurationModuleService from "../../../modules/image-configuration/service"

const createImageSizeStep = createStep(
  "create-image-size-step",
  async (input: Record<string, any>, { container }) => {
    const service = container.resolve<ImageConfigurationModuleService>(IMAGE_CONFIGURATION_MODULE)
    const imageSize = await service.createImageSizes(input)
    return new StepResponse(imageSize)
  }
)

export const createImageSizeWorkflow = createWorkflow("create-imageSize", (input: Record<string, any>) => {
  const imageSize = createImageSizeStep(input)
  return new WorkflowResponse(imageSize)
})
