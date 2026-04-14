import { LinkDefinition } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import {
  PRODUCT_CONFIGURATION_MODULE,
  ProductConfigurationInput,
} from "../../../modules/product-configuration"
import ProductConfigurationService from "../../../modules/product-configuration/service"

export const createProductConfigurationsStepId = "create-product-configurations"

export interface CreateProductConfigurationsStepInput {
  products: Array<{ id: string; handle: string }>
  productConfigurations: Array<{
    productHandle: string
    config: ProductConfigurationInput
  }>
}

interface CompensationPayload {
  linksToDismiss: LinkDefinition[]
  createdConfigIds: string[]
}

export const createProductConfigurationsStep = createStep(
  createProductConfigurationsStepId,
  async (input: CreateProductConfigurationsStepInput, { container }) => {
    const productConfigService =
      container.resolve<ProductConfigurationService>(PRODUCT_CONFIGURATION_MODULE)
    const linkService = container.resolve(ContainerRegistrationKeys.LINK)

    const linksToCreate: LinkDefinition[] = []
    const createdConfigIds: string[] = []

    for (const product of input.products) {
      const configEntry = input.productConfigurations.find(
        (c) => c.productHandle === product.handle
      )

      if (!configEntry?.config) {
        continue
      }

      if (configEntry.config.id) {
        linksToCreate.push({
          [Modules.PRODUCT]: { product_id: product.id },
          [PRODUCT_CONFIGURATION_MODULE]: {
            product_configuration_id: configEntry.config.id,
          },
        })
        continue
      }

      const created = await productConfigService.createProductConfigurations(
        configEntry.config
      )

      createdConfigIds.push(created.id)
      linksToCreate.push({
        [Modules.PRODUCT]: { product_id: product.id },
        [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: created.id },
      })
    }

    if (linksToCreate.length > 0) {
      await linkService.create(linksToCreate)
    }

    const output = {
      processed: input.products.length,
      successful: linksToCreate.length,
      linksToCreate,
      createdConfigIds,
    }

    const compensation: CompensationPayload = {
      linksToDismiss: linksToCreate,
      createdConfigIds,
    }

    return new StepResponse(output, compensation)
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }

    const { linksToDismiss, createdConfigIds } =
      compensation as CompensationPayload
    const productConfigService =
      container.resolve<ProductConfigurationService>(PRODUCT_CONFIGURATION_MODULE)
    const linkService = container.resolve(ContainerRegistrationKeys.LINK)

    if (linksToDismiss?.length) {
      await linkService.dismiss(linksToDismiss)
    }

    if (createdConfigIds?.length) {
      await productConfigService.softDeleteProductConfigurations(createdConfigIds)
    }
  }
)
