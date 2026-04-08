import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { IMAGE_CONFIGURATION_MODULE } from "../../../modules/image-configuration"
import ImageConfigurationModuleService from "../../../modules/image-configuration/service"

const getAllImageStep = createStep("get-all-image-step", async (_input: Record<string, any>, { container }) => {
  const service = container.resolve<ImageConfigurationModuleService>(IMAGE_CONFIGURATION_MODULE)
  const list = await service.listImageSizes({})
  return new StepResponse(list)
})

const getAllResizeConfigStep = createStep("get-all-resize-config-step", async (_input: Record<string, any>, { container }) => {
  const service = container.resolve<ImageConfigurationModuleService>(IMAGE_CONFIGURATION_MODULE)
  const list = await service.listResizeConfigs({}, { relations: ["image_sizes"] } as any)
  return new StepResponse(list)
})

const getResizeConfigStep = createStep("get-resize-config-step", async (input: { unique_name?: string }, { container }) => {
  const service = container.resolve<ImageConfigurationModuleService>(IMAGE_CONFIGURATION_MODULE)
  const [config] = await service.listResizeConfigs({ unique_name: input.unique_name }, { relations: ["image_sizes"] } as any)
  return new StepResponse(config)
})

export const getAllImageWorkflow = createWorkflow("get-image-config", (input: Record<string, any>) => {
  const result = getAllImageStep(input)
  return new WorkflowResponse(result)
})

export const getAllResizeConfigWorkflow = createWorkflow("get-all-resize-config", (input: Record<string, any>) => {
  const result = getAllResizeConfigStep(input)
  return new WorkflowResponse(result)
})

export const getResizeConfigWorkflow = createWorkflow("get-resize-config", (input: { unique_name?: string }) => {
  const result = getResizeConfigStep(input)
  return new WorkflowResponse(result)
})
