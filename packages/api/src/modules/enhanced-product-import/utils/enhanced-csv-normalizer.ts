import { CSVNormalizer, normalizeCSVValue, isPresent, MedusaError, toHandle } from "@medusajs/framework/utils"
import type { AttributeMapping, CategoryAttributeWithValues, CategoryWithAttributes } from "../types"
import { ProductConfigurationInput } from "../../product-configuration"
import { logger } from "@medusajs/framework"
import { BrandColumnProcessor } from "./BrandColumnProcessor"
import { EnhancedColumnProcessor } from "./EnhancedColumnProcessor"
import { SizeChartColumnProcessor } from "./SizeChartColumnProcessor"
import { ProductConfigurationProcessor } from "./ProductConfigurationProcessor"
import { AttributeColumnProcessor } from "./AttributeColumnProcessor"
import { EmptyNonMedusaColumnFilterProcessor } from "./EmptyNonMedusaColumnFilterProcessor"

type EnhancedNormalizedRow = ReturnType<typeof CSVNormalizer.preProcess> & {
  // Enhanced columns
  brand?: string
  "is returnable"?: boolean
  "is exchangeable"?: boolean
  "is try and buy"?: boolean
  "returnable days"?: number

  // Dynamic attributes (detected at runtime)
  [attributeKey: string]: any

  // Size chart data (columns ending with "(Size chart)")
  sizeChartData?: Record<string, string>

  // Validated attributes for this product
  attributes?: Record<string, any>
}

export interface ValidationContext {
  attribute?: CategoryAttributeWithValues
  rowNumber: number
}

// Legacy types for backward compatibility during migration
interface ClassificationContext {
  configColumns: string[]
  attributeMap: Map<string, CategoryAttributeWithValues>
  rowNumber: number
}

interface ClassificationResult {
  type: 'brand' | 'sizeChart' | 'config' | 'attribute' | 'standard' | 'skip'
  key: string
  value: any
  additionalData?: any
}

// Utility function for error creation (following Medusa pattern)
export function createError(rowNumber: number, message: string) {
  return new MedusaError(MedusaError.Types.INVALID_DATA, `Row ${rowNumber}: ${message}`)
}

// ============================================================================
// SIZE CHART HELPERS
// ============================================================================

/**
 * Creates measurement objects from raw size chart key-value pairs.
 */
function createMeasurements(data: Record<string, string>) {
  return Object.entries(data).map(([key, value]) => {
    const name = key.replace(/\s*\(size chart\)$/i, '').trim()

    // Simple unit inference
    let unit = "Inches"
    if (name.toLowerCase().includes("(cm)")) unit = "cm"
    if (name.toLowerCase().includes("(meters)")) unit = "Meters"

    let formattedValue = String(value)
    if (!isNaN(parseFloat(formattedValue))) {
      formattedValue = parseFloat(formattedValue).toFixed(1)
    }

    return {
      name,
      type: "Body Measurement",
      unit,
      value: formattedValue,
      maxValue: formattedValue,
      minValue: formattedValue,
      displayText: formattedValue
    }
  })
}

/**
 * Injects size chart measurements into the variant metadata column
 * so Medusa's processAsJson("variant metadata", "metadata") natively
 * assigns it to the correct variant per row.
 */
function injectSizeChartIntoVariantMetadata(
  sizeChartData: Record<string, string>,
  medusaStandardRow: Record<string, string | boolean | number>,
  rowNumber: number
): void {
  if (!sizeChartData || Object.keys(sizeChartData).length === 0) return

  const measurements = createMeasurements(sizeChartData)

  medusaStandardRow["variant metadata"] = JSON.stringify({ measurements })

  // Remove the original casing key if different to avoid Medusa's unknown column error
  if (medusaStandardRow["Variant Metadata"]) {
    delete medusaStandardRow["Variant Metadata"]
  }
}

// ============================================================================
// STRATEGY REGISTRY
// ============================================================================

/**
 * Registry for Enhanced Column Processors with priority-based ordering
 */
class EnhancedColumnRegistry {
  private processors: EnhancedColumnProcessor[] = []
  private static instance: EnhancedColumnRegistry

  constructor(private skipDefaultProcessors: boolean = false) {
    if (!skipDefaultProcessors) {
      this.registerDefaultProcessors()
    }
  }

  static getInstance(): EnhancedColumnRegistry {
    if (!this.instance) {
      this.instance = new EnhancedColumnRegistry()
    }
    return this.instance
  }

  /**
   * Register a new column processor with priority-based insertion
   */
  registerProcessor(processor: EnhancedColumnProcessor): void {
    // Create a safe wrapper that preserves all methods
    const safeProcessor: EnhancedColumnProcessor = {
      type: processor.type,
      priority: processor.priority,
      canHandle: processor.canHandle.bind(processor),
      validate: processor.validate ? processor.validate.bind(processor) : undefined,
      process: (csvRow, rowColumns, rowNumber, output, currentColumn) => {
        try {
          processor.process(csvRow, rowColumns, rowNumber, output, currentColumn)
        } catch (error) {
          logger.warn(`[EnhancedColumnRegistry] Processor ${processor.type} failed for row ${rowNumber}: ${error}`)
          throw error // Re-throw to maintain error handling behavior
        }
      }
    }

    // Insert based on priority (higher priority first)
    const insertIndex = this.processors.findIndex(p => p.priority < processor.priority)
    if (insertIndex === -1) {
      this.processors.push(safeProcessor)
    } else {
      this.processors.splice(insertIndex, 0, safeProcessor)
    }

    logger.debug(`[EnhancedColumnRegistry] Registered processor: ${processor.type} (priority: ${processor.priority})`)
  }

  /**
   * Register default built-in processors
   */
  private registerDefaultProcessors(): void {
    this.registerProcessor(new BrandColumnProcessor())
    this.registerProcessor(new SizeChartColumnProcessor())
    this.registerProcessor(new ProductConfigurationProcessor())
    this.registerProcessor(new EmptyNonMedusaColumnFilterProcessor())
    // AttributeProcessor registered dynamically with category context
  }

  /**
   * Get a copy of all processors (for creating category-specific registries)
   */
  getProcessors(): EnhancedColumnProcessor[] {
    return [...this.processors] // Return a copy
  }

  /**
   * Find the appropriate processor for a column
   */
  findProcessor(columnName: string, normalizedColumnName: string): EnhancedColumnProcessor | null {
    return this.processors.find(p => p.canHandle(columnName, normalizedColumnName)) || null
  }

  /**
   * Create category-specific registry with attribute processor
   */
  createCategoryRegistry(categoryAttributes: CategoryAttributeWithValues[]): EnhancedColumnRegistry {
    const categoryRegistry = new EnhancedColumnRegistry(true) // Skip default processors

    // Copy all existing processors from the main registry
    const existingProcessors = this.getProcessors()
    existingProcessors.forEach(processor => {
      categoryRegistry.registerProcessor(processor)
    })

    // Add attribute processor for this category if attributes exist
    if (categoryAttributes.length > 0) {
      const attributeMap = new Map(
        categoryAttributes.map(attr => [attr.attribute.name.toLowerCase(), attr])
      )
      categoryRegistry.registerProcessor(new AttributeColumnProcessor(attributeMap))

    }

    return categoryRegistry
  }

  /**
   * Get count of registered processors (for debugging)
   */
  getProcessorCount(): number {
    return this.processors.length
  }
}

/**
 * Enhanced CSV normalizer that extends Medusa's core CSVNormalizer
 * to handle custom columns for seller-brand authorization, dynamic attributes,
 * configuration flags, and size chart data.
 *
 * This extends Medusa's existing normalization logic while adding support
 * for our enhanced columns.
 */
export class EnhancedCSVNormalizer extends CSVNormalizer {
  /**
   * Strategy registry instance
   */
  private static registry = EnhancedColumnRegistry.getInstance()
  // private static initialized = false

  /**
   * Initialize the normalizer and validate Strategy pattern functionality
   */
  // private static initialize(): void {
  //   if (!this.initialized) {
  //     console.log('[EnhancedCSVNormalizer] Initializing Strategy pattern...')

  //     // Validate Strategy pattern processors
  //     if (!this.registry.validateProcessors()) {
  //       throw new Error('[EnhancedCSVNormalizer] Strategy pattern processor validation failed during initialization')
  //     }

  //     // Validate complete functionality preservation
  //     if (!this.validateStrategyImplementation()) {
  //       throw new Error('[EnhancedCSVNormalizer] Strategy pattern functionality validation failed - breaking changes detected')
  //     }

  //     this.initialized = true
  //     console.log(`[EnhancedCSVNormalizer] Successfully initialized with ${this.registry.getProcessorCount()} processors`)
  //   }
  // }

  /**
   * Register a new column processor (for extensibility)
   */
  static registerColumnProcessor(processor: EnhancedColumnProcessor): void {
    this.registry.registerProcessor(processor)
  }
  // Legacy cache for backward compatibility (will be removed in future versions)
  private static attributeMaps = new WeakMap<CategoryAttributeWithValues[], Map<string, CategoryAttributeWithValues>>()
  private static headerStrategies = new WeakMap<CategoryAttributeWithValues[], Map<string, any>>()


  /**
   * Processes the column value as a boolean
   */
  // private static processAsBoolean<Output>(
  //   inputKey: string,
  //   outputKey: keyof Output
  // ): (
  //   csvRow: Record<string, string | boolean | number>,
  //   rowColumns: string[],
  //   rowNumber: number,
  //   output: Output
  // ) => void {
  //   return (csvRow, _, __, output) => {
  //     let value = csvRow[inputKey]
  //     if (isPresent(value)) {
  //       // Handle "True"/"False" strings (case insensitive)
  //       if (typeof value === 'string') {
  //         const lowerValue = value.toLowerCase().trim()
  //         if (lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1') {
  //           value = true
  //         } else if (lowerValue === 'false' || lowerValue === 'no' || lowerValue === '0') {
  //           value = false
  //         }
  //       }
  //       output[outputKey as any] = value
  //     }
  //   }
  // }

  // /**
  //  * Processes the column value as a number
  //  */
  // private static processAsNumber<Output>(
  //   inputKey: string,
  //   outputKey: keyof Output
  // ): (
  //   csvRow: Record<string, string | boolean | number>,
  //   rowColumns: string[],
  //   rowNumber: number,
  //   output: Output
  // ) => void {
  //   return (csvRow, _, rowNumber, output) => {
  //     const value = csvRow[inputKey]
  //     if (isPresent(value)) {
  //       const num = Number(value)
  //       if (!isNaN(num)) {
  //         output[outputKey as any] = num
  //       }
  //     }
  //   }
  // }

  // /**
  //  * Validates an attribute value against its possible values
  //  */
  // private static validateAttributeValue(
  //   attribute: CategoryAttributeWithValues,
  //   value: any,
  //   rowNumber: number
  // ): void {
  //   if (attribute.possibleValues && attribute.possibleValues.length > 0) {
  //     const possibleValues = attribute.possibleValues.map(v => v.value.trim())
  //     const stringValue = String(value).trim()

  //     const isValid = possibleValues.some(pv => pv.toLowerCase() === stringValue.toLowerCase())

  //     console.log("Validation result:", isValid)
  //     if (!isValid) {
  //       throw new MedusaError(MedusaError.Types.INVALID_DATA, `Invalid value '${value}' for attribute '${attribute.attribute.name}' (Row ${rowNumber}). Possible values: ${possibleValues.join(', ')}`)
  //     }
  //   }
  // }

  // /**
  //  * Attempts to match a CSV column key to a category attribute
  //  */
  // private static matchCategoryAttribute(
  //   key: string,
  //   attributeMap: Map<string, CategoryAttributeWithValues>,
  //   rowNumber: number
  // ): CategoryAttributeWithValues | undefined {
  //   // Only match by the original key lowercased (CSV headers are attribute names)
  //   const lowerKey = key.toLowerCase()
  //   const match = attributeMap.get(lowerKey)

  //   console.log(`[EnhancedCSVNormalizer] Trying to match "${key}" -> "${lowerKey}" -> ${match ? 'FOUND' : 'NOT FOUND'}`)
  //   if (!match) {
  //     console.log(`[EnhancedCSVNormalizer] Available keys starting with "${lowerKey.charAt(0)}":`,
  //       Array.from(attributeMap.keys()).filter(k => k.startsWith(lowerKey.charAt(0))).slice(0, 5))
  //   }

  //   return match
  // }

  /**
   * Captures the target status and forces status to 'draft'
   * Returns the target status for metadata storage
   */


  /**
   * Enhanced preProcess that filters out product configuration columns and size chart columns
   * before passing to Medusa's normalizer, then adds them back for later processing.
   * Also handles status override and image URL extraction for serverless processing.
   */
  static preProcess(
    row: Record<string, string | boolean | number>,
    rowNumber: number,
    categoryWithAttributes?: CategoryWithAttributes
  ): EnhancedNormalizedRow {
    // Ensure initialization on first use
    // this.initialize()
    const attributes = categoryWithAttributes?.attributes || [];
    // Create category-specific registry with attribute processors
    const registry = this.registry.createCategoryRegistry(attributes)

    // Initialize data collections
    const enhancedData: Record<string, any> = {}
    const medusaStandardRow: Record<string, string | boolean | number> = {}
    const rowColumns = Object.keys(row)

    logger.debug(`[EnhancedCSVNormalizer] Processing row ${rowNumber} with ${rowColumns.length} columns`)

    // Process each column using Strategy pattern
    rowColumns.forEach(column => {
      const normalizedKey = normalizeCSVValue(column).toLowerCase()
      const value = row[column]

      logger.debug(`[EnhancedCSVNormalizer] Processing column: ${column} (normalized: ${normalizedKey})`)

      // Try to find an enhanced processor for this column
      const processor = registry.findProcessor(column, normalizedKey)

      if (processor) {
        try {
          processor.process(row, rowColumns, rowNumber, enhancedData, column)
        } catch (error) {
          logger.error(`[EnhancedCSVNormalizer] Processor ${processor.type} failed for column ${column}: ${error}`)
          throw error
        }
      } else {
        // Standard Medusa column - pass to Medusa's processor
        // logger.debug(`[EnhancedCSVNormalizer] Standard Medusa column: ${column}`)
        medusaStandardRow[column] = value
      }
    })

    // Inject size chart measurements into variant metadata before Medusa processes the row
    injectSizeChartIntoVariantMetadata(enhancedData.sizeChartData, medusaStandardRow, rowNumber)

    // Process standard columns through Medusa's normalizer
    const normalizedRow = super.preProcess(medusaStandardRow, rowNumber) as EnhancedNormalizedRow

    // Merge enhanced data with normalized row (following original structure)
    const result: EnhancedNormalizedRow = {
      ...normalizedRow,
      // Enhanced data from Strategy processors
      brand: enhancedData.brand,
      attributes: enhancedData.enhancedAttributes,
      // Product configuration data (merge with existing row if any)
      ...enhancedData.productConfiguration
    }

    logger.debug(`[EnhancedCSVNormalizer] Result: ${JSON.stringify(result)}`)

    logger.debug(`[EnhancedCSVNormalizer] Row ${rowNumber} processed successfully`)
    return result
  }

  #rows: EnhancedNormalizedRow[]

  constructor(rows: EnhancedNormalizedRow[]) {
    super(rows)
    this.#rows = rows
  }
  /**
 * Processes brand data for a product
 * Uses first-row-wins strategy with consistency validation
 */
  private processBrand(product: any, row: EnhancedNormalizedRow): void {
    if (row.brand) {
      // First row wins - only set if not already set
      if (!product.brand) {
        product.brand = row.brand
      } else if (product.brand !== row.brand) {
        // Warn about inconsistency across variant rows
        logger.warn(
          `Inconsistent brand detected for product "${product.handle ? product.handle : product.id}": expected "${product.brand}", found "${row.brand}"`
        )
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Inconsistent brand detected for product "${product.handle}": expected "${product.brand}", found "${row.brand}"`)
      }
    }
  }

  /**
 * Processes configuration data for a product
 * Uses deduplication: only processes configuration once per product (first row wins)
 */
  private processConfiguration(
    product: any,
    row: EnhancedNormalizedRow,
    rowColumns: string[],
    rowNumber: number
  ): void {
    // Configuration data processed by the Strategy pattern (ProductConfigurationProcessor)
    const configData = {
      is_returnable: row.is_returnable,
      is_exchangeable: row.is_exchangeable,
      is_try_and_buy: row.is_try_and_buy,
      returnable_days: row.returnable_days
    }

    // Deduplication: first row wins - only set config fields that don't already exist
    Object.entries(configData).forEach(([key, value]) => {
      if (value !== undefined) { // Only process if the value exists
        if (product[key] === undefined) {
          product[key] = value
        } else if (product[key] !== value) {
          // Warn about inconsistency across variant rows
          logger.warn(
            `Inconsistent configuration "${key}" for product "${product.handle ? product.handle : product.id}": expected "${product[key]}", found "${value}"`
          )
          throw new MedusaError(MedusaError.Types.INVALID_DATA, `Inconsistent configuration "${key}" for product "${product.handle ? product.handle : product.id}": expected "${product[key]}", found "${value}"`)
        }
      }
    })
  }



  /**
 * Processes attributes for a product
 * Deduplicates attributes across variant rows (following Medusa's option deduplication pattern)
 */
  private processAttributes(product: any, row: EnhancedNormalizedRow): void {
    if (!row.attributes || Object.keys(row.attributes).length === 0) return

    if (!product.attributes) {
      product.attributes = []
    }

    // Deduplicate attributes - only add if not already present
    Object.entries(row.attributes).forEach(([handle, attrData]) => {
      const matchingAttr = product.attributes.find(
        (attr: any) => attr.name === handle && attr.value === String(attrData.value)
      )

      // Check for inconsistent attribute values (same attribute, different value)
      const conflictingAttr = product.attributes.find(
        (attr: any) => attr.name === handle && attr.value !== String(attrData.value)
      )

      if (conflictingAttr) {
        logger.warn(
          `Inconsistent attribute "${handle}" for product "${product.handle ? product.handle : product.id}": expected "${conflictingAttr.value}", found "${attrData.value}"`
        )
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Inconsistent attribute "${handle}" for product "${product.handle ? product.handle : product.id}": expected "${conflictingAttr.value}", found "${attrData.value}"`)
      }

      if (!matchingAttr) {
        product.attributes.push({
          name: handle,
          value: String(attrData.value),
          attribute_id: attrData.attribute_id
        })
      }
    })
  }

  /**
   * Enriches a single product with enhanced data from the CSV row
   */
  private enrichProduct(
    product: any,
    row: EnhancedNormalizedRow,
    rowColumns: string[],
    rowNumber: number
  ): void {
    this.processBrand(product, row)
    this.processConfiguration(product, row, rowColumns, rowNumber)
    // Size chart is handled in preProcess via variant metadata injection — no post-processing needed
    this.processAttributes(product, row)
    this.processImages(product, row)
    // Only override status to draft if there are images to process via Lambda
    // If no images, keep the CSV status as-is since there's no Lambda to restore it later
    if (product.status && product._pending_images?.length) {
      const { originalStatus, newStatus } = this.overrideStatusToDraft(product)
      if (!product._target_status) {
        product._target_status = originalStatus
        product.status = newStatus
      }
    }
    // console.log("Enriched product:", product)
    return product
  }

  private overrideStatusToDraft(
    product: any
  ): { originalStatus: string, newStatus: string } {
    const statusKey = Object.keys(product).find(k => k === 'status')
    const originalStatus = statusKey ? String(product[statusKey]) : 'draft'
    const newStatus = 'draft'
    return { originalStatus, newStatus }
  }

  processImages(product: any, row: EnhancedNormalizedRow) {
    // console.log("Processing images for product:", product.handle)
    // console.log("Product in Process:", JSON.stringify(product))
    // Only process images if we haven't already done so and there are images to process
    if (!product._pending_images && product.images && product.images.length > 0) {
      product._pending_images = product.images.map((image: any) => image.url)
      product.images = []
    }
  }
  /**
   * Processes CSV rows and merges enhanced data (brand, configs, etc.) 
   * into the resulting product objects.
   * 
   * Note: proccess is intentionally misspelled to match Medusa's CSVNormalizer.proccess
   */
  proccess(resumingFromIndex: number = 0) {
    const products = super.proccess(resumingFromIndex)

    // Iterate over rows to enrich products with enhanced data
    this.#rows.forEach((row, index) => {
      const rowNumber = resumingFromIndex + index + 1
      const rowColumns = Object.keys(row)

      const productId = row["product id"]
      const productHandle = row["product handle"]

      // Find the product created/updated by Medusa
      const product = productId
        ? products.toUpdate[String(productId)]
        : products.toCreate[String(productHandle)]

      if (product) {
        this.enrichProduct(product, row, rowColumns, rowNumber)
      }
    })
    return products
  }
}