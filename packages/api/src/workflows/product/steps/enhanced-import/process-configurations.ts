import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ENHANCED_PRODUCT_IMPORT_MODULE } from "../../../../modules/enhanced-product-import"
import { MedusaError } from "@medusajs/framework/utils"

export const processConfigurationsStepId = "process-configurations"

/**
 * Normalizes returnable_days value to integer
 */
const normalizeReturnableDays = (value: string): number => {
  const trimmed = value.trim().toLowerCase()

  // Extract number from various formats: "7", "7 days", "7d"
  const match = trimmed.match(/(\d+)/)
  if (!match) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Invalid returnable_days value: '${value}'. Expected number or 'X days' format.`)
  }

  return parseInt(match[1], 10)
}

/**
 * Normalizes boolean configuration values
 */
const normalizeBoolean = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase()
  return ['true', 'yes', '1', 'on', 'enabled'].includes(trimmed)
}

/**
 * Determines if a column is a configuration flag
 */
const isConfigurationColumn = (key: string): boolean => {
  const configColumns = [
    'returnable_days',
    'is_fragile',
    'requires_assembly',
    'custom_shipping_required'
  ]
  return configColumns.includes(key)
}

/**
 * Processes a single configuration value
 */
const processConfigValue = (key: string, value: string): any => {
  switch (key) {
    case 'returnable_days':
      return normalizeReturnableDays(value)
    case 'is_fragile':
    case 'requires_assembly':
    case 'custom_shipping_required':
      return normalizeBoolean(value)
    default:
      return value
  }
}

/**
 * Extracts and processes configuration flags from a product
 */
const extractConfigurationsFromProduct = (product: any) => {
  const configurations: any[] = []
  const configNames: string[] = []

  for (const [key, value] of Object.entries(product)) {
    if (!isConfigurationColumn(key) || !value) {
      continue
    }

    const processedValue = processConfigValue(key, String(value))
    product[key] = processedValue

    configurations.push({ name: key, value: processedValue })
    configNames.push(key)
  }

  return { configurations, configNames }
}

/**
 * Processes configuration flags for a single product
 */
const processProductConfigurations = (product: any) => {
  const { configurations, configNames } = extractConfigurationsFromProduct(product)

  return {
    configCount: configurations.length,
    hasConfigurations: configurations.length > 0,
    configNames
  }
}

/**
 * Configuration flags processing step
 */
export const processConfigurationsStep = createStep(
  {
    name: processConfigurationsStepId,
    async: false,
  },
  async (input: { csvData: { create?: any[]; update?: any[] }; sellerId: string }, { container }) => {
    const logger = container.resolve("logger")

    try {
      const stats = {
        configurationFlags: new Set<string>(),
        totalConfigurationsAdded: 0,
        productsWithConfigs: 0
      }

      const processProductList = (products: any[]) => {
        if (!products?.length) return products

        return products.map(product => {
          const result = processProductConfigurations(product)

          // Update statistics
          if (result.hasConfigurations) {
            stats.productsWithConfigs++
            stats.totalConfigurationsAdded += result.configCount
            result.configNames.forEach(name => stats.configurationFlags.add(name))
          }

          return product
        })
      }

      const processedData: { create?: any[]; update?: any[] } = {}

      if (input.csvData.create) {
        processedData.create = processProductList(input.csvData.create)
      }

      if (input.csvData.update) {
        processedData.update = processProductList(input.csvData.update)
      }

      logger.info(`[Enhanced Import] Configuration flags processing successful - Total configurations added: ${stats.totalConfigurationsAdded}, Products with configs: ${stats.productsWithConfigs}, Configuration flags: ${Array.from(stats.configurationFlags).join(', ')}`)

      return new StepResponse({
        processedData,
        configurationFlags: Array.from(stats.configurationFlags)
      })

    } catch (error) {
      logger.error("[Enhanced Import] Configuration flags processing failed", error)

      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Configuration processing failed: ${error.message}`)
    }
  }
)