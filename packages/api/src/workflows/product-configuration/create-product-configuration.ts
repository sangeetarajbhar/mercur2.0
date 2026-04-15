import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  PRODUCT_CONFIGURATION_MODULE,
  ProductConfigurationInput,
} from "../../modules/product-configuration"
import ProductConfigurationService from "../../modules/product-configuration/service"

export type CreateProductConfigurationStepInput = ProductConfigurationInput

export const createProductConfigurationStep = createStep(
  "create-product-configuration-step",
  async (input: CreateProductConfigurationStepInput, { container }) => {
    const productConfigurationModuleService =
      container.resolve<ProductConfigurationService>(PRODUCT_CONFIGURATION_MODULE)

    const productConfiguration =
      await productConfigurationModuleService.createProductConfigurations(input)

    return new StepResponse(productConfiguration, productConfiguration.id)
  },
  async (id: string, { container }) => {
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product configuration ID is required for compensation"
      )
    }

    const productConfigurationModuleService =
      container.resolve<ProductConfigurationService>(PRODUCT_CONFIGURATION_MODULE)

    await productConfigurationModuleService.softDeleteProductConfigurations(id)
  }
)

type CreateProductConfigurationWorkflowInput = ProductConfigurationInput

export const createProductConfigurationWorkflow = createWorkflow(
  "create-product-configuration",
  (input: CreateProductConfigurationWorkflowInput) => {
    const productConfiguration = createProductConfigurationStep(input)

    return new WorkflowResponse(productConfiguration)
  }
)
