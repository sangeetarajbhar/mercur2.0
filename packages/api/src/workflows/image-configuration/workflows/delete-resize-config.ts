import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { IMAGE_CONFIGURATION_MODULE } from "../../../modules/image-configuration"
import ImageConfigurationModuleService from "../../../modules/image-configuration/service"

const deleteResizeConfigStep = createStep(
  "delete-resize-config-step",
  async (input: { unique_name: string }, { container }) => {
    const service = container.resolve<ImageConfigurationModuleService>(IMAGE_CONFIGURATION_MODULE)
    const [resizeConfig] = await service.listResizeConfigs({ unique_name: input.unique_name })
    if (resizeConfig) {
      await service.softDeleteResizeConfigs((resizeConfig as any).id)
    }
    return new StepResponse({ success: true })
  }
)

const deleteImageSizeStep = createStep(
  "delete-image-size-step",
  async (input: { id: string }, { container }) => {
    const service = container.resolve<ImageConfigurationModuleService>(IMAGE_CONFIGURATION_MODULE)
    await service.softDeleteImageSizes(input.id)
    return new StepResponse({ success: true })
  }
)

export const deleteResizeConfigWorkflow = createWorkflow(
  "delete-resize-config",
  (input: { unique_name: string }) => {
    const result = deleteResizeConfigStep(input)
    return new WorkflowResponse(result)
  }
)

export const deleteImageSizesWorkflow = createWorkflow(
  "delete-image-size",
  (input: { id: string }) => {
    const result = deleteImageSizeStep(input)
    return new WorkflowResponse(result)
  }
)
