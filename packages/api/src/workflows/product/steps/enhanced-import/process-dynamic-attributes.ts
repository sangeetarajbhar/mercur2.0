import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ENHANCED_PRODUCT_IMPORT_MODULE } from "../../../../modules/enhanced-product-import"
import { MedusaError } from "@medusajs/framework/utils"

export const processDynamicAttributesStepId = "process-dynamic-attributes"

/**
 * Extracts dynamic attributes from a single product
 */
const extractAttributesFromProduct = (product: any, standardColumns: string[]) => {
  const attributes: any[] = []
  const attributeNames: string[] = []

  for (const [key, value] of Object.entries(product)) {
    if (shouldSkipColumn(key, value, standardColumns)) {
      continue
    }

    attributes.push({ name: key, value: String(value).trim() })
    attributeNames.push(key)
  }

  return { attributes, attributeNames }
}

/**
 * Determines if a column should be skipped during attribute extraction
 */
const shouldSkipColumn = (key: string, value: any, standardColumns: string[]) => {
  return (
    standardColumns.includes(key) ||
    value === null ||
    value === undefined ||
    value === '' ||
    key === 'size_chart' ||
    key.includes('image')
  )
}

/**
 * Validates attributes against category requirements
 */
const validateAttributesForCategories = async (attributeNames: string[], categories: string[], enhancedImportService: any) => {
  for (const attributeName of attributeNames) {
    const validation = await enhancedImportService.validateAttributeForCategory(attributeName, categories)
    if (!validation.isValid) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, validation.errors.join('; '))
    }
  }
}

/**
 * Processes size chart data for a product
 */
const processSizeChart = (product: any, enhancedImportService: any) => {
  const sizeChartResult = enhancedImportService.extractSizeChartFromProduct(product)

  if (!sizeChartResult.hasSizeChart) {
    return { processed: false }
  }

  const validation = enhancedImportService.validateSizeChart(sizeChartResult.sizeChart)
  if (!validation.isValid) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid size chart format for product '${product.handle || product.title}': ${validation.errors.join(', ')}`
    )
  }

  product.size_chart = sizeChartResult.sizeChart
  removeSizeChartColumns(product, sizeChartResult.originalValue)

  return { processed: true }
}

/**
 * Removes original size chart string columns from product
 */
const removeSizeChartColumns = (product: any, originalValue: string) => {
  const sizeChartColumns = ['size_chart', 'size chart', 'sizes', 'sizing']
  sizeChartColumns.forEach(col => {
    if (product[col] === originalValue) {
      delete product[col]
    }
  })
}

/**
 * Removes processed attribute columns from product data
 */
const removeAttributeColumns = (product: any, attributeNames: string[]) => {
  attributeNames.forEach(attrName => {
    delete product[attrName]
  })
}

/**
 * Processes a single product for dynamic attributes
 */
const processProductAttributes = async (product: any, enhancedImportService: any) => {
  const standardColumns = enhancedImportService.getStandardMedusaColumns()

  // Process size chart
  const sizeChart = processSizeChart(product, enhancedImportService)

  // Extract attributes
  const { attributes, attributeNames } = extractAttributesFromProduct(product, standardColumns)

  // Validate attributes against categories
  if (product.category_id && attributeNames.length > 0) {
    const categories = Array.isArray(product.category_id) ? product.category_id : [product.category_id]
    await validateAttributesForCategories(attributeNames, categories, enhancedImportService)
  }

  // Update product with attributes
  product.attributes = attributes
  removeAttributeColumns(product, attributeNames)

  return {
    attributeCount: attributes.length,
    hasAttributes: attributes.length > 0,
    sizeChartProcessed: sizeChart.processed
  }
}

/**
 * Dynamic attribute processing step
 */
export const processDynamicAttributesStep = createStep(
  {
    name: processDynamicAttributesStepId,
    async: false,
  },
  async (input: { csvData: { create?: any[]; update?: any[] }; sellerId: string }, { container }) => {
    const enhancedImportService = container.resolve(ENHANCED_PRODUCT_IMPORT_MODULE)
    const logger = container.resolve("logger")

    try {
      const stats = {
        detectedAttributes: new Set<string>(),
        totalAttributesAdded: 0,
        productsWithAttributes: 0,
        sizeChartsProcessed: 0
      }

      const processProductList = async (products: any[]) => {
        if (!products?.length) return products

        return await Promise.all(
          products.map(async (product) => {
            const result = await processProductAttributes(product, enhancedImportService)

            // Update statistics
            if (result.hasAttributes) {
              stats.productsWithAttributes++
              stats.totalAttributesAdded += result.attributeCount
              product.attributes.forEach(attr => stats.detectedAttributes.add(attr.name))
            }

            if (result.sizeChartProcessed) {
              stats.sizeChartsProcessed++
            }

            return product
          })
        )
      }

      const processedData: { create?: any[]; update?: any[] } = {}

      if (input.csvData.create) {
        processedData.create = await processProductList(input.csvData.create)
      }

      if (input.csvData.update) {
        processedData.update = await processProductList(input.csvData.update)
      }

      logger.info(`[Enhanced Import] Dynamic attributes processing successful - Total attributes added: ${stats.totalAttributesAdded}, Products with attributes: ${stats.productsWithAttributes}, Size charts processed: ${stats.sizeChartsProcessed}, Detected attributes: ${Array.from(stats.detectedAttributes).join(', ')}`)

      return new StepResponse({
        processedData,
        detectedAttributes: Array.from(stats.detectedAttributes),
        sizeChartsProcessed: stats.sizeChartsProcessed
      })

    } catch (error) {
      logger.error("[Enhanced Import] Dynamic attribute processing failed", error)

      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Dynamic attribute processing failed: ${error.message}`)
    }
  }
)