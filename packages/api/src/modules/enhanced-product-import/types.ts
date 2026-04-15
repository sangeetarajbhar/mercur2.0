import { BatchProductWorkflowInput } from "@medusajs/medusa/core-flows"


export interface EnhancedBatchProductInput extends BatchProductWorkflowInput {
  csvData: string
  sellerId: string
  transactionId: string
  processAttributes?: boolean
  processImages?: boolean
  processConfigurations?: boolean
}

export interface EnhancedProductRow {
  handle: string
  title: string
  description?: string
  brand?: string
  category?: string
  returnable?: boolean
  exchangeable?: boolean
  try_and_buy?: boolean
  returnable_days?: string
  [key: `image_${string}`]: string | undefined
  [key: string]: any
}

export interface AttributeMapping {
  columnName?: string
  attributeHandle: string
  value: string
  rowIndex?: number
  productHandle?: string
}

export interface ConfigFlags extends ProductConfigurationInput {
  rowIndex: number
  productHandle: string
}

import { ProductConfigurationInput } from "../product-configuration"



export interface ImageData {
  url: string
  type: 'Front' | 'Back' | 'Side' | 'Detail' | 'Look shot' | 'Lifestyle'
  columnName: string
}

export interface SizeChartData {
  measurementName: string
  value: string
  variantId?: string
}

export interface ProcessingResult {
  success: boolean
  errors: string[]
  processedProducts: number
  createdProducts: number
  updatedProducts: number
}

export interface ValidationError {
  row: number
  field: string
  message: string
  value?: any
}

export interface CategoryAttribute {
  id: string
  handle: string
  name: string
  is_required: boolean
  ui_component: string
  is_filterable: boolean
}

// Attribute possible values (separate entity)
export interface AttributePossibleValue {
  id: string
  value: string
  rank: number
}

export interface CategoryWithAttributes {
  id: string | undefined
  attributes: CategoryAttributeWithValues[]
}

// Category attribute with its possible values (composition)
export interface CategoryAttributeWithValues {
  attribute: CategoryAttribute
  possibleValues: AttributePossibleValue[]
}

// Validation context for CSV processing
export interface CSVValidationContext {
  categoryId: string
  attributesWithValues: CategoryAttributeWithValues[]

  // Fast lookup maps for performance
  attributesByHandle: Map<string, CategoryAttributeWithValues>

  // Product config validation rules
  configValidators: Map<string, (value: any) => { valid: boolean; message?: string }>
}

// Enhanced validation error structure (aligned with Medusa's pattern)
export interface CSVValidationError {
  row: number
  message: string  // Should follow "Row X: message" format like Medusa
  column?: string  // Optional for context
  value?: any     // Optional for debugging
  errorType: 'attribute_value' | 'config_format' | 'size_chart_format' | 'unknown_column'
}

// Helper function to create Medusa-compatible errors
export function createCSVValidationError(
  rowNumber: number,
  message: string,
  errorType: CSVValidationError['errorType'],
  column?: string,
  value?: any
): CSVValidationError {
  return {
    row: rowNumber,
    message: `Row ${rowNumber}: ${message}`,
    column,
    value,
    errorType
  }
}