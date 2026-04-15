import type { WorkflowData } from "@medusajs/framework/workflows-sdk"
import { ProductTypes } from "@medusajs/framework/types"

/**
 * Enhanced CSV chunk data structure
 */
export type EnhancedCSVChunk = {
  id: string
  toCreate: number
  toUpdate: number
  enhancedData?: {
    dynamicAttributes: Record<string, string>[]
    configurations: Record<string, any>[]
    sizeCharts: Record<string, any>[]
    images: Record<string, string[]>[]
  }
}

/**
 * Enhanced import summary - extends core summary
 */
export type EnhancedImportSummary = {
  toCreate: number
  toUpdate: number
  totalRows?: number
  attributesProcessed?: number
  configurationsProcessed?: number
  imagesQueued?: number
}

/**
 * Seller-brand authorization context
 */
export type SellerBrandAuthContext = {
  sellerId: string
  brandIds: string[]
  productIds: string[]
}

/**
 * Enhanced CSV normalization input
 */
export type EnhancedCSVNormalizeInput = {
  fileKey: string
  sellerId: string
  categoryId?: string // Category ID for database-driven attribute validation
  transactionId?: string
}

/**
 * Enhanced chunk processing input
 */
export type EnhancedProcessChunksInput = {
  chunks: EnhancedCSVChunk[]
  authContext?: SellerBrandAuthContext
}

/**
 * Dynamic attribute mapping result
 */
export type AttributeMappingResult = {
  attributeHandle: string
  attributeId: string
  value: string
  isValid: boolean
  categoryId?: string
}

/**
 * Configuration flag processing result
 */
export type ConfigurationResult = {
  returnable?: boolean
  exchangeable?: boolean
  try_and_buy?: boolean
  returnable_days?: number
}

/**
 * Enhanced image processing result
 */
export type EnhancedImageResult = {
  columnName: string
  url: string
  imageType: 'thumbnail' | 'product_image'
  downloadStatus: 'pending' | 'success' | 'failed'
  processedUrls?: string[]
}