import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import ProductConfigurationService from "../../../modules/product-configuration/service"
import { PRODUCT_CONFIGURATION_MODULE } from "../../../modules/product-configuration"

type UpdateProductConfigurationsStepInput = {
  productConfigurations: Array<{ productId: string; config: Record<string, any> }>
}

type CompensationData = Array<{
  type: "create" | "update"
  configId: string
  productId: string
  previousConfig: Record<string, any> | null
}>

export const updateProductConfigurationsStep = createStep(
  "update-product-configurations",
  async (input: UpdateProductConfigurationsStepInput, { container }) => {
    const configModule =
      container.resolve<ProductConfigurationService>(PRODUCT_CONFIGURATION_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const linkService = container.resolve(ContainerRegistrationKeys.LINK)

    const uniqueProductIds = [
      ...new Set(input.productConfigurations.map((i) => i.productId)),
    ]

    const { data: productConfigLinks } = await query.graph({
      entity: "product_product_configuration",
      fields: [
        "product_id",
        "product_configuration.id",
        "product_configuration.is_returnable",
        "product_configuration.is_exchangeable",
        "product_configuration.is_try_and_buy",
        "product_configuration.returnable_days",
      ],
      filters: { product_id: uniqueProductIds },
    })

    const productConfigMap = new Map<string, any>()
    productConfigLinks.forEach((link: any) => {
      productConfigMap.set(link.product_id, link.product_configuration)
    })

    const compensationData: CompensationData = []
    const toUpdate: any[] = []
    const toCreate: Array<{ productId: string; config: Record<string, any> }> = []

    for (const item of input.productConfigurations) {
      const existingConfig = productConfigMap.get(item.productId)

      if (existingConfig) {
        compensationData.push({
          type: "update",
          configId: existingConfig.id,
          productId: item.productId,
          previousConfig: {
            is_returnable: existingConfig.is_returnable,
            is_exchangeable: existingConfig.is_exchangeable,
            is_try_and_buy: existingConfig.is_try_and_buy,
            returnable_days: existingConfig.returnable_days,
          },
        })

        toUpdate.push({
          id: existingConfig.id,
          ...item.config,
        })
      } else {
        toCreate.push(item)
      }
    }

    if (toUpdate.length > 0) {
      await configModule.updateProductConfigurations(toUpdate)
    }

    if (toCreate.length > 0) {
      const createdConfigs =
        await configModule.createProductConfigurations(toCreate.map((i) => i.config))

      const links = createdConfigs.map((config: any, index: number) => ({
        [Modules.PRODUCT]: { product_id: toCreate[index].productId },
        [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: config.id },
      }))

      await linkService.create(links)

      createdConfigs.forEach((config: any, index: number) => {
        compensationData.push({
          type: "create",
          configId: config.id,
          productId: toCreate[index].productId,
          previousConfig: null,
        })
      })
    }

    return new StepResponse(null, compensationData)
  },
  async (compensationData, { container }) => {
    if (!compensationData || !Array.isArray(compensationData)) {
      return
    }

    const configModule =
      container.resolve<ProductConfigurationService>(PRODUCT_CONFIGURATION_MODULE)
    const linkService = container.resolve(ContainerRegistrationKeys.LINK)

    const toRevertCreate = (compensationData as CompensationData).filter(
      (item) => item.type === "create"
    )
    const toRevertUpdate = (compensationData as CompensationData).filter(
      (item) => item.type === "update"
    )

    if (toRevertCreate.length > 0) {
      const linksToDismiss = toRevertCreate.map((item) => ({
        [Modules.PRODUCT]: { product_id: item.productId },
        [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: item.configId },
      }))

      await linkService.dismiss(linksToDismiss)
      await configModule.softDeleteProductConfigurations(
        toRevertCreate.map((item) => item.configId)
      )
    }

    if (toRevertUpdate.length > 0) {
      await configModule.updateProductConfigurations(
        toRevertUpdate.map((item) => ({
          id: item.configId,
          ...item.previousConfig,
        }))
      )
    }
  }
)
