// import { parse } from "csv-parse/sync"
// import type { CSVValidationContext, CSVValidationError } from "../../../../../modules/enhanced-product-import/types"
// import { createCSVValidationError } from "../../../../../modules/enhanced-product-import/types"

// /**
//  * Column patterns for identifying custom fields in CSV
//  */
// export const CUSTOM_FIELD_PATTERNS = {
//   dynamicAttributes: /^attr_(.+)$/,
//   sizeCharts: /^(.+)\s*\(Size chart\)$/i,
// } as const

// /**
//  * Product configuration columns (return policy, etc.)
//  */
// export const PRODUCT_CONFIG_COLUMNS = new Set([
//   "Is Returnable",
//   "Is Exchangeable",
//   "Is Try And Buy",
//   "Returnable Days"
// ])


// export type CustomFieldType = keyof typeof CUSTOM_FIELD_PATTERNS

// export interface ExtractedCustomFields {
//   // Single object per row containing all custom field types
//   customFieldsPerRow: Array<{
//     _rowIndex: number
//     _productHandle: string
//     _variantSku: string | null
//     dynamicAttributes: { [attributeHandle: string]: any } // e.g., { "color": "red", "material": "cotton" }
//     sizeCharts: { [sizeKey: string]: any } // e.g., { "xl_chest": "40", "m_waist": "32" }
//     productConfigs: {
//       is_returnable?: boolean
//       is_exchangeable?: boolean
//       is_try_and_buy?: boolean
//       returnable_days?: number
//     }
//   }>
// }

// export interface CsvFieldExtractionResult {
//   standardData: any[]
//   customFields: ExtractedCustomFields
//   standardColumns: string[]
//   customColumns: { [fieldType: string]: string[] }
//   totalCustomFields: number
//   validationErrors: CSVValidationError[]
// }

// interface CategoryAttribute {
//   id: string
//   handle: string
//   name: string
//   is_required: boolean
//   ui_component: string
//   is_filterable: boolean
// }

// /**
//  * Extracts custom fields from CSV data while preserving standard Medusa columns
//  */
// export class CsvFieldExtractor {
//   private customFieldPatterns = CUSTOM_FIELD_PATTERNS

//   /**
//    * Parse CSV content string and extract both standard and custom fields with validation
//    * @param csvContent - CSV file content
//    * @param validationContext - Single category validation context (legacy)
//    * @param enhancedImportService - Service for multi-category validation (Option C)
//    */
//   async extractFromCsvContent(
//     csvContent: string,
//     validationContext?: CSVValidationContext,
//     enhancedImportService?: any
//   ): Promise<CsvFieldExtractionResult> {
//     // Parse CSV with headers (same options as Medusa uses)
//     const records = parse(csvContent, {
//       columns: true,
//       skip_empty_lines: true,
//       trim: true,
//     })

//     if (!records || records.length === 0) {
//       throw new Error("CSV file is empty or invalid")
//     }

//     // Multi-category validation (Future planned feature)
//     if (enhancedImportService && !validationContext) {
//       throw new Error("Multi-category validation not yet implemented")
//     }

//     // Legacy: Single category validation
//     return this.extractFromRecords(records, validationContext)
//   }

//   /**
//    * Extract custom fields from already parsed CSV records with validation
//    * @param records - Parsed CSV records
//    * @param validationContext - Validation context for fail-fast validation
//    */
//   extractFromRecords(
//     records: any[],
//     validationContext?: CSVValidationContext
//   ): CsvFieldExtractionResult {
//     if (!records || records.length === 0) {
//       throw new Error("No records provided for field extraction")
//     }

//     const headers = Object.keys(records[0])
//     const validationErrors: CSVValidationError[] = []
//     const { standardColumns, customColumnsByType } = this.categorizeColumns(headers, validationContext)

//     // Fail-fast validation: stop on first error
//     if (validationContext) {
//       for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
//         const rowValidationErrors = this.validateRow(records[rowIndex], rowIndex + 2, validationContext, customColumnsByType) // +2 because CSV rows start at 2 (header is row 1)
//         if (rowValidationErrors.length > 0) {
//           // Fail fast - throw first validation error found
//           const firstError = rowValidationErrors[0]
//           throw new Error(firstError.message)
//         }
//       }
//     }

//     // Separate data
//     const standardData = this.extractStandardData(records, standardColumns)
//     const customFields = this.extractCustomFieldsByType(records, customColumnsByType, validationErrors)

//     return {
//       standardData,
//       customFields,
//       standardColumns,
//       customColumns: customColumnsByType,
//       totalCustomFields: Object.values(customColumnsByType).flat().length,
//       validationErrors
//     }
//   }

//   /**
//    * Categorize columns into standard and custom types
//    * @param headers - CSV column headers
//    * @param validationContext - Validation context for attribute validation
//    */
//   private categorizeColumns(
//     headers: string[],
//     validationContext?: CSVValidationContext
//   ) {
//     const standardColumns: string[] = []
//     const customColumnsByType: { [fieldType: string]: string[] } = {}

//     // Initialize custom column arrays
//     Object.keys(this.customFieldPatterns).forEach(type => {
//       customColumnsByType[type] = []
//     })
//     customColumnsByType.productConfigs = []

//     // Create set of valid attribute handles for quick lookup
//     const validAttributeHandles = validationContext
//       ? new Set(validationContext.attributesWithValues.map(attrWithValues => `attr_${attrWithValues.attribute.handle}`))
//       : new Set<string>()

//     headers.forEach(header => {
//       let isCustomField = false

//       // Check dynamic attributes (attr_*) against database
//       if (this.customFieldPatterns.dynamicAttributes.test(header)) {
//         if (validAttributeHandles.has(header)) {
//           customColumnsByType.dynamicAttributes.push(header)
//           isCustomField = true
//         }
//         // If attr_* pattern but not in database, skip it (invalid attribute)
//       }
//       // Check size charts (size_*) - always accept if matches pattern
//       else if (this.customFieldPatterns.sizeCharts.test(header)) {
//         customColumnsByType.sizeCharts.push(header)
//         isCustomField = true
//       }
//       // Check product configs - direct column name match
//       else if (PRODUCT_CONFIG_COLUMNS.has(header)) {
//         customColumnsByType.productConfigs.push(header)
//         isCustomField = true
//       }

//       // Everything else goes to standard columns (let Medusa validate)
//       if (!isCustomField) {
//         standardColumns.push(header)
//       }
//     })

//     return { standardColumns, customColumnsByType }
//   }

//   /**
//    * Extract only standard Medusa columns from records
//    */
//   private extractStandardData(records: any[], standardColumns: string[]): any[] {
//     return records.map(record => {
//       const standardRecord: any = {}
//       standardColumns.forEach(column => {
//         if (record[column] !== undefined) {
//           standardRecord[column] = record[column]
//         }
//       })
//       return standardRecord
//     })
//   }

//   /**
//    * Validates a single CSV row against validation context
//    * @param record - CSV row data
//    * @param rowNumber - Row number (1-based for user display)
//    * @param validationContext - Validation context
//    * @param customColumnsByType - Custom columns categorized by type
//    * @returns Array of validation errors for this row
//    */
//   private validateRow(
//     record: any,
//     rowNumber: number,
//     validationContext: CSVValidationContext,
//     customColumnsByType: { [fieldType: string]: string[] }
//   ): CSVValidationError[] {
//     const errors: CSVValidationError[] = []

//     // Validate dynamic attributes
//     customColumnsByType.dynamicAttributes?.forEach(column => {
//       const value = record[column]
//       if (value !== undefined && value !== "") {
//         const fieldMatch = this.customFieldPatterns.dynamicAttributes.exec(column)
//         if (fieldMatch) {
//           const attributeHandle = fieldMatch[1]
//           const attrWithValues = validationContext.attributesByHandle.get(attributeHandle)

//           if (attrWithValues && attrWithValues.possibleValues.length > 0) {
//             const validValues = attrWithValues.possibleValues.map(pv => pv.value)
//             if (!validValues.includes(String(value))) {
//               errors.push(createCSVValidationError(
//                 rowNumber,
//                 `Invalid value provided for "${attrWithValues.attribute.name}". Expected one of: ${validValues.join(', ')}, received "${value}"`,
//                 'attribute_value',
//                 column,
//                 value
//               ))
//             }
//           }
//         }
//       }
//     })

//     // Validate product configurations
//     customColumnsByType.productConfigs?.forEach(column => {
//       const value = record[column]
//       if (value !== undefined && value !== "") {
//         let configKey: string
//         switch (column) {
//           case "Returnable Days":
//             configKey = 'returnable_days'
//             break
//           case "Is Returnable":
//             configKey = 'is_returnable'
//             break
//           case "Is Exchangeable":
//             configKey = 'is_exchangeable'
//             break
//           case "Is Try And Buy":
//             configKey = 'is_try_and_buy'
//             break
//           default:
//             return // Skip unknown config columns
//         }

//         const validator = validationContext.configValidators.get(configKey)
//         if (validator) {
//           const result = validator(value)
//           if (!result.valid) {
//             errors.push(createCSVValidationError(
//               rowNumber,
//               `Invalid value provided for "${column}". ${result.message}, received "${value}"`,
//               'config_format',
//               column,
//               value
//             ))
//           }
//         }
//       }
//     })

//     return errors
//   }

//   /**
//    * Extract custom fields organized by row
//    */
//   private extractCustomFieldsByType(
//     records: any[],
//     customColumnsByType: { [fieldType: string]: string[] },
//     validationErrors: CSVValidationError[]
//   ): ExtractedCustomFields {
//     const customFields: ExtractedCustomFields = {
//       customFieldsPerRow: []
//     }

//     records.forEach((record, index) => {
//       const dynamicAttributes: { [key: string]: any } = {}
//       const sizeCharts: { [key: string]: any } = {}
//       const productConfigs: any = {}

//       // Extract dynamic attributes (attr_*)
//       customColumnsByType.dynamicAttributes?.forEach(column => {
//         if (record[column] !== undefined && record[column] !== "") {
//           const fieldMatch = this.customFieldPatterns.dynamicAttributes.exec(column)
//           if (fieldMatch) {
//             dynamicAttributes[fieldMatch[1]] = record[column]
//           }
//         }
//       })

//       // Extract size charts (size_*)
//       customColumnsByType.sizeCharts?.forEach(column => {
//         if (record[column] !== undefined && record[column] !== "") {
//           const fieldMatch = this.customFieldPatterns.sizeCharts.exec(column)
//           if (fieldMatch) {
//             sizeCharts[fieldMatch[1]] = record[column]
//           }
//         }
//       })

//       // Extract product configs (direct column names)
//       customColumnsByType.productConfigs?.forEach(column => {
//         if (record[column] !== undefined && record[column] !== "") {
//           const value = record[column]
//           switch (column) {
//             case "Returnable Days":
//               productConfigs.returnable_days = this.parseInteger(value)
//               break
//             case "Is Returnable":
//               productConfigs.is_returnable = this.parseBoolean(value)
//               break
//             case "Is Exchangeable":
//               productConfigs.is_exchangeable = this.parseBoolean(value)
//               break
//             case "Is Try And Buy":
//               productConfigs.is_try_and_buy = this.parseBoolean(value)
//               break
//           }
//         }
//       })

//       // Only add row if it has custom fields
//       if (Object.keys(dynamicAttributes).length > 0 ||
//         Object.keys(sizeCharts).length > 0 ||
//         Object.keys(productConfigs).length > 0) {
//         customFields.customFieldsPerRow.push({
//           _rowIndex: index,
//           _productHandle: record["Product Handle"] || record["Product Id"] || "",
//           _variantSku: record["Variant SKU"] || null,
//           dynamicAttributes,
//           sizeCharts,
//           productConfigs
//         })
//       }
//     })

//     return customFields
//   }

//   /**
//    * Parse boolean values safely
//    */
//   private parseBoolean(value: any): boolean {
//     if (typeof value === 'boolean') return value
//     if (typeof value === 'string') {
//       return value.toLowerCase() === 'true' || value === '1'
//     }
//     return Boolean(value)
//   }

//   /**
//    * Parse integer values safely
//    */
//   private parseInteger(value: any): number {
//     const parsed = parseInt(String(value), 10)
//     return isNaN(parsed) ? 0 : parsed
//   }

// }

// /**
//  * Utility function to merge custom data back into processed chunks
//  */
// export function mergeCustomDataIntoChunks(
//   standardChunks: any[],
//   customFields: ExtractedCustomFields,
//   sellerId: string
// ): any[] {
//   return standardChunks.map(chunk => ({
//     ...chunk,
//     sellerId,
//     enhanced: true,
//     customData: customFields.customFieldsPerRow || [],
//     toCreate: chunk.toCreate?.map((product: any) => ({
//       ...product,
//       _customFieldsAvailable: true,
//       _sellerId: sellerId
//     })),
//     toUpdate: chunk.toUpdate?.map((product: any) => ({
//       ...product,
//       _customFieldsAvailable: true,
//       _sellerId: sellerId
//     }))
//   }))
// }