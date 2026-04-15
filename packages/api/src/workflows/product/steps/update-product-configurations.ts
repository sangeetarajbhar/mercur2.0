import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import EnhancedProductImportService from "../../../modules/enhanced-product-import/services/enhanced-product-import.service"
import { ENHANCED_PRODUCT_IMPORT_MODULE } from "../../../modules/enhanced-product-import"
import { PRODUCT_CONFIGURATION_MODULE } from "../../../modules/product-configuration"
import ProductConfigurationService from "../../../modules/product-configuration/service"

export const updateProductConfigurationsStep = createStep(
    "update-product-configurations",
    async (input: {
        productConfigurations: Array<{ productId: string, config: any }>
    }, { container }) => {
        const enhancedImportService: EnhancedProductImportService = container.resolve(ENHANCED_PRODUCT_IMPORT_MODULE)
        const configModule: ProductConfigurationService = container.resolve(PRODUCT_CONFIGURATION_MODULE)
        const query = container.resolve("query")
        const linkService = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

        // 1. Prepare & Query - use product IDs only for updates
        const uniqueProductIds = [...new Set(input.productConfigurations.map(i => i.productId))]

        // Fetch existing configurations linked to products using the link table
        const { data: productConfigLinks } = await query.graph({
            entity: "product_product_configuration",
            fields: [
                "product_id",
                "product_configuration.*",
                "product_configuration.id",
                "product_configuration.is_returnable",
                "product_configuration.is_exchangeable",
                "product_configuration.is_try_and_buy",
                "product_configuration.returnable_days"
            ],
            filters: {
                product_id: uniqueProductIds
            }
        })

        // Create a map: productId -> configuration
        const productConfigMap = new Map()
        productConfigLinks.forEach((link: any) => {
            productConfigMap.set(link.product_id, link.product_configuration)
        })

        // We'll store compensation data with strict typing for clarity
        const compensationData: Array<{
            type: 'create' | 'update',
            configId: string,
            productId: string,
            previousConfig: any | null
        }> = []

        const toUpdate: any[] = []
        const toCreate: any[] = []

        // 2. Classify actions
        for (const item of input.productConfigurations) {
            const existingConfig = productConfigMap.get(item.productId)

            if (existingConfig) {
                // UPDATE: Capture previous state
                compensationData.push({
                    type: 'update',
                    configId: existingConfig.id,
                    productId: item.productId,
                    previousConfig: {
                        is_returnable: existingConfig.is_returnable,
                        is_exchangeable: existingConfig.is_exchangeable,
                        is_try_and_buy: existingConfig.is_try_and_buy,
                        returnable_days: existingConfig.returnable_days
                    }
                })

                toUpdate.push({
                    id: existingConfig.id,
                    ...item.config
                })
            } else {
                // CREATE: Mark for creation
                toCreate.push({
                    productId: item.productId,
                    config: item.config
                })
            }
        }

        // 3. Execute Updates
        if (toUpdate.length > 0) {
            await configModule.updateProductConfigurations(toUpdate)
        }

        // 4. Execute Creates (and link)
        // 4. Execute Creates (and link) in Batch
        if (toCreate.length > 0) {
            const configsToCreate = toCreate.map(item => item.config)
            const createdConfigs = await configModule.createProductConfigurations(configsToCreate)

            const links = createdConfigs.map((config, index) => ({
                [Modules.PRODUCT]: { product_id: toCreate[index].productId },
                [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: config.id }
            }))

            await linkService.create(links)

            createdConfigs.forEach((config, index) => {
                compensationData.push({
                    type: 'create',
                    configId: config.id,
                    productId: toCreate[index].productId,
                    previousConfig: null
                })
            })
        }

        return new StepResponse(null, compensationData)
    },
    async (compensationData, { container }) => {
        if (!compensationData || !Array.isArray(compensationData)) {
            return
        }

        const configModule: ProductConfigurationService = container.resolve(PRODUCT_CONFIGURATION_MODULE)
        const linkService = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

        // Group by type for batch processing
        const toRevertCreate = compensationData.filter(i => i.type === 'create')
        const toRevertUpdate = compensationData.filter(i => i.type === 'update')

        // 1. Revert Creates (Dismiss Links + Delete Configs)
        if (toRevertCreate.length > 0) {
            // Batch Dismiss - pass array of link definitions
            const linksToDismiss = toRevertCreate.map(item => ({
                [Modules.PRODUCT]: { product_id: item.productId },
                [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: item.configId }
            }))

            try {
                await (linkService as any).dismiss(linksToDismiss)
            } catch (error) {
                // If batch dismiss fails (unlikely if supported), log but continue to delete configs
                console.error(`Failed to batch dismiss links during rollback`, error)
                // Fallback to chunks if needed? For now assume batch works or we log.
            }

            // Batch Delete
            const configIds = toRevertCreate.map(i => i.configId)
            await (configModule as any).deleteProductConfigurations(configIds)
        }

        // 2. Revert Updates (Batch Update)
        if (toRevertUpdate.length > 0) {
            const updates = toRevertUpdate.map(item => ({
                id: item.configId,
                ...item.previousConfig
            }))
            await configModule.updateProductConfigurations(updates)
        }
    }
)
