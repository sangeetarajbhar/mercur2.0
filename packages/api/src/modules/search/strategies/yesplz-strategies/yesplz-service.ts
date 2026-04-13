import { AxiosError } from 'axios'
import { randomUUID } from 'crypto'
import { createHmac } from 'crypto'
import { MedusaError } from '@medusajs/framework/utils'
import { YesPlzApiClient } from './yesplz-api-client'

/**
 * Calculate discount fields for YesPlz format
 * Matches transformer logic from yesplz-product-transformer.ts
 */
export function calculateYesPlzDiscount(
  dbDiscountPercentage: number | null | undefined,
  mrp: number,
  price: number
): { discountLabel: string; discountDisplayLabel: string } {
  // Priority: 1) discount_percentage from DB (if set), 2) calculate from mrp/price
  let discountPercentage = 0

  if (dbDiscountPercentage != null && Number.isFinite(dbDiscountPercentage)) {
    // Use discount percentage from database (fetched via enrichProductsWithDiscountPercentages)
    discountPercentage = Math.round(dbDiscountPercentage)
  } else if (mrp > 0 && price > 0 && mrp > price) {
    // Fallback: calculate from mrp and price
    discountPercentage = Math.round(((mrp - price) / mrp) * 100)
  }

  const hasDiscount = discountPercentage > 0
  const discountLabel = hasDiscount ? 'Flat_Search_Percent' : ''
  const discountDisplayLabel = hasDiscount ? `(${discountPercentage}% OFF)` : ''

  return { discountLabel, discountDisplayLabel }
}

export type YesPlzServiceOptions = {
  apiUrl: string
  webhookSecret: string
  retailerAdminKey?: string // API key for collections and admin endpoints
  rateLimit?: number
  retryAttempts?: number
  timeout?: number
  batchSize?: number // Batch size for processing products (default: 20)
}

export interface WebhookResult {
  success: boolean
  message?: string
  product_id?: string
  event_type?: string
  error?: string
}

export interface ListProductsParams {
  q?: string
  offset?: number
  limit?: number
  sort?: 'recommended' | 'popularity' | 'newest' | 'discount' | 'price_asc' | 'price_desc'
  location?: string
  currency?: string
  // Filter parameters
  gender?: string | string[]
  brands?: string | string[]
  color?: string | string[]
  sizes?: string | string[]
  occasion?: string | string[]
  pattern_type?: string | string[]
  fit_type?: string | string[]
  neckline?: string | string[]
  sleeve_style?: string | string[]
  fabric_details?: string | string[]
  top_type?: string | string[]
  bottom_type?: string | string[]
  collar_type?: string | string[]
  closure_type?: string | string[]
  category?: string | string[]
  // Range filters
  price?: string // Format: "MIN-MAX" (e.g., "10-100")
  discount?: string // Format: "MIN-MAX" (e.g., "20-50")
  price_filter?: string // Alternative to price
}

export interface ProductListResponse {
  totalCount: number
  totalCountRepresentation?: string
  hasNextPage: boolean
  filters?: {
    savedFilters: any[]
    primaryFilters: Array<{
      id: string
      filterValues: Array<{
        id: string
        value: string
        count: number
        meta: string
        pLevel: string
        icon: string
        hideCount: boolean
      }>
    }>
  }
  products: any[]
  sortOptions?: Array<{
    value: string
    displayName: string
    selected: boolean
  }>
  pagination?: {
    currentPage: number
    pageSize: number
    totalPages: number
    offset: number
    nextPageUrl: string | null
    prevPageUrl: string | null
  }
  limit: number
  offset: number
}

/**
 * Collection list item structure
 */
export interface CollectionListItem {
  id: string
  title: string
  description?: string
  image_url?: string | null
  condition_match: 'all' | 'any' | 'custom' | 'manual'
  status: string
  product_count: number
  conditions_summary?: string
  has_condition_warnings: boolean
  scheduled_publish_at?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  product_images?: string[]
}

/**
 * Collection list parameters
 */
export interface ListCollectionsParams {
  search?: string
  status?: string
  sort?: string
  page?: number
  page_size?: number
  offset?: number
  limit?: number
}

/**
 * Collection list response
 */
export interface CollectionListResponse {
  totalCount: number
  totalCountRepresentation?: string
  hasNextPage: boolean
  results: CollectionListItem[]
  pagination: {
    currentPage: number
    pageSize: number
    totalPages: number
    offset: number
  }
}

/**
 * Keyword suggestion parameters
 */
export interface KeywordSuggestionParams {
  query?: string // Search prefix (max 128 chars). Empty = popular keywords
  top_category?: string // Filter by category (e.g., "Women", "Men", "ALL")
  lang?: string // Language code ("en", "ko", etc.)
  count?: number // Number of suggestions to return (max 50)
  sale?: string // Filter by sale status ("all", "true", "false")
  pinned?: boolean // Include admin-pinned keywords at specified ranks
  detail?: boolean // Include purchase stats for each keyword
  days?: number // Days of stats to aggregate (1-90, requires detail=true)
}

/**
 * Keyword suggestion response
 */
export interface KeywordSuggestionResponse {
  count: number
  results: Array<{
    suggestion: string
    [key: string]: any // Additional fields when detail=true
  }>
  message?: string // Optional error message from API
}

/**
 * YesPlz Service
 * Handles YesPlz-specific API operations including webhook sending and API calls
 */
export class YesPlzService {
  private options: YesPlzServiceOptions
  private apiClient: YesPlzApiClient
  private readonly timeout: number

  constructor(options: YesPlzServiceOptions) {
    if (!options.apiUrl || !options.webhookSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        'YesPlz options are required: apiUrl and webhookSecret'
      )
    }

    this.options = {
      rateLimit: 100,
      retryAttempts: 3,
      timeout: 30000,
      ...options
    }

    this.timeout = this.options.timeout!

    // Initialize API client with retry configuration
    // Retry logic is handled by the client, not the service
    this.apiClient = new YesPlzApiClient({
      apiUrl: this.options.apiUrl,
      timeout: this.options.timeout!,
      retryAttempts: this.options.retryAttempts,
      retailerAdminKey: this.options.retailerAdminKey
    })
  }


  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${randomUUID().replace(/-/g, '').substring(0, 24)}`
  }

  /**
   * Compute HMAC-SHA256 signature for YesPlz webhook payload
   */
  private computeWebhookSignature(payload: object): string {
    const body = JSON.stringify(payload, null, 0)
    const hmac = createHmac('sha256', this.options.webhookSecret)
    hmac.update(body)
    return hmac.digest('hex')
  }

  /**
   * Build webhook payload
   */
  private buildPayload(eventType: string, data: any): {
    id: string
    type: string
    data: any
    created_at: string
  } {
    return {
      id: this.generateEventId(),
      type: eventType,
      data,
      created_at: new Date().toISOString()
    }
  }

  /**
   * Send webhook event to YesPlz
   */
  private async sendWebhookEvent(payload: {
    id: string
    type: string
    data: any
    created_at?: string
  }): Promise<WebhookResult> {
    if (!this.options.webhookSecret) {
      return {
        success: false,
        error: 'Webhook secret is missing'
      }
    }

    try {
      // Compute HMAC signature
      const signature = this.computeWebhookSignature(payload)

      // Optional debug log to capture exact outbound webhook payload sent to YesPlz.
      // Enable only when needed to avoid noisy logs: YESPLZ_LOG_OUTBOUND_WEBHOOK=true
      if (process.env.YESPLZ_LOG_OUTBOUND_WEBHOOK === 'true') {
        console.info(
          `[YesPlz] Outbound webhook payload: ${JSON.stringify({
            id: payload.id,
            type: payload.type,
            created_at: payload.created_at,
            data: payload.data
          })}`
        )
      }

      // Send request - retry logic is handled automatically by the API client
      const response = await this.apiClient.sendWebhook(payload, signature)

      const result: WebhookResult = {
        success: response.success !== false,
        message: response.message,
        product_id: response.product_id || payload.data?.productId || payload.data?.id,
        event_type: response.event_type
      }

      if (!result.success) {
        // Extract detailed error information from errors array if available
        const errors = response.errors || []
        const errorDetails = errors.length > 0
          ? errors.map((err: any) => ({
            productId: err.productId || err.product_id,
            error: err.error || err.message,
            field: err.field,
            value: err.value,
            ...err
          }))
          : []

        // Build comprehensive error message
        let errorMessage = response.error || response.message || 'Unknown error'
        if (errorDetails.length > 0) {
          const detailedErrors = errorDetails.map((err: any) =>
            err.error || err.message || JSON.stringify(err)
          ).join('; ')
          errorMessage = `${errorMessage}. Details: ${detailedErrors}`
        }

        result.error = errorMessage
      }
      return result
    } catch (error: unknown) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status
      const responseData = axiosError.response?.data as { error?: string; message?: string } | undefined
      const errorMessage = responseData?.error ||
        responseData?.message ||
        axiosError.message ||
        'Unknown error'

      // 404 is an error - throw it
      if (status === 404) {
        const productId = payload.data?.productId || payload.data?.id

        throw new Error(`Resource not found (404): ${errorMessage} - Product: ${productId}, Event: ${payload.type}`)
      }

      // Handle specific error cases
      if (status === 403) {
        return {
          success: false,
          error: 'Invalid signature',
          product_id: payload.data?.productId || payload.data?.id,
          event_type: payload.type
        }
      }

      if (status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          product_id: payload.data?.productId || payload.data?.id,
          event_type: payload.type
        }
      }

      return {
        success: false,
        error: errorMessage,
        product_id: payload.data?.productId || payload.data?.id,
        event_type: payload.type
      }
    }
  }

  /**
   * Send product created event
   */
  async sendProductCreated(product: any): Promise<WebhookResult> {
    const payload = this.buildPayload('product.created', product)
    return this.sendWebhookEvent(payload)
  }

  /**
   * Send product updated event
   */
  async sendProductUpdated(product: any): Promise<WebhookResult> {
    const payload = this.buildPayload('product.updated', product)
    return this.sendWebhookEvent(payload)
  }

  /**
   * Send product deleted event
   */
  async sendProductDeleted(productId: string): Promise<WebhookResult> {
    const payload = this.buildPayload('product.deleted', { productId: productId })
    return this.sendWebhookEvent(payload)
  }

  /**
   * Send product partial update event (for updating specific fields like popularity/score)
   * Uses product.patched event type per YesPlz webhook integration documentation
   * This is the PATCH method for syncing scores/popularity without sending full product data
   * 
   * Reference: YesPlz ZILO_WEBHOOK_INTEGRATION documentation
   * 
   * Note: YesPlz webhook format uses productId (camelCase) - consistent with product.created, 
   * product.updated, and product.deleted events
   * 
   * @param productId  - Product ID to update
   * @param finalScore - Recommendation score to apply (sent as final_score in payload)
   */
  async sendProductRecommendationScoreUpdate(productId: string, finalScore: number): Promise<WebhookResult> {
    const payload = this.buildPayload('product.updated', {
      productId,
      final_score: finalScore
    })
    return this.sendWebhookEvent(payload)
  }


  /**
   * Send product inventory update via product.updated (partial payload).
   * Sends productId, isInStock, and inventoryInfo.
   * Product-level isInStock is always true for partial sync (YesPlz / listing visibility); per-variant
   * availability stays in inventoryInfo[].available.
   */
  async sendProductInventoryUpdate(
    productId: string,
    inventoryInfo: Array<{
      skuId: string
      label: string
      available: boolean
      brandSizeLabel: string
      location: string[]
    }>
  ): Promise<WebhookResult> {
    const isInStock = true
    const payload = this.buildPayload('product.updated', {
      productId,
      isInStock,
      inventoryInfo
    })
    return this.sendWebhookEvent(payload)
  }

  /**
   * Send product price update via product.updated event type (partial update).
   * Sends productId, productName (required by YesPlz), mrp, and price.
   * YesPlz may reject product.patched for price fields; product.updated is accepted for partial data.
   */
  async sendProductPriceUpdate(
    productId: string,
    mrp: number,
    price: number,
    sellerId: string,
    productName: string,
    discountPercentage?: number
  ): Promise<WebhookResult> {
    const safeMrp = Number.isFinite(mrp) ? Math.max(0, mrp) : 0
    const safePrice = Number.isFinite(price) ? Math.max(0, price) : 0
    const safeName =
      typeof productName === 'string' && productName.trim().length > 0
        ? productName.trim()
        : 'Product'

    const payload: any = {
      productId,
      productName: safeName,
      mrp: safeMrp,
      price: safePrice,
      seller: {
        sellerId
      }
    }

    // Calculate and add discount in YesPlz format (always include, even when no discount)
    const discountInfo = calculateYesPlzDiscount(discountPercentage, safeMrp, safePrice)
    payload.discountLabel = discountInfo.discountLabel
    payload.discountDisplayLabel = discountInfo.discountDisplayLabel

    const webhookPayload = this.buildPayload('product.updated', payload)
    return this.sendWebhookEvent(webhookPayload)
  }

  /**
   * Send product active state update via product.updated event type (partial update).
   * Sends only productId and isActive so YesPlz can mark the product inactive/active.
   */
  async sendProductActiveStateUpdate(productId: string, isActive: boolean): Promise<WebhookResult> {
    const payload = this.buildPayload('product.updated', { productId, isActive })
    return this.sendWebhookEvent(payload)
  }

  /**
   * Get a single product by ID (verification)
   * @throws Error if product is not found (404) or other HTTP errors occur
   */
  async getProduct(productId: string): Promise<any> {
    return this.apiClient.getProduct(productId)
  }

  /**
   * List products with filters and search capabilities
   * Handles both simple listing and advanced search with filters
   * Uses unified endpoint for all requests
   */
  async listProducts(params?: ListProductsParams): Promise<ProductListResponse> {
    // Use the unified products endpoint for both listing and searching
    return this.apiClient.listProducts(params)
  }

  /**
   * List collections from YesPlz API
   * Requires retailer_admin_key for authentication
   * 
   * @param params - Query parameters for filtering and pagination
   * @returns Collection list response
   */
  async listCollections(params?: ListCollectionsParams): Promise<CollectionListResponse> {
    return this.apiClient.listCollections(params)
  }

  /**
   * Get keyword suggestions from YesPlz API
   * Public endpoint - no authentication required
   * 
   * @param params - Query parameters for keyword suggestions
   * @returns Keyword suggestion response
   */
  async getKeywordSuggestions(params?: KeywordSuggestionParams): Promise<KeywordSuggestionResponse> {
    return this.apiClient.getKeywordSuggestions(params)
  }

  /**
   * Get popular searches from YesPlz API
   * Public endpoint - no authentication required
   * Uses keyword suggestion API with empty query to get popular keywords
   * 
   * @param params - Query parameters for popular searches (top_category, lang, count, etc.)
   * @returns Keyword suggestion response with popular searches
   */
  async getPopularSearches(params?: Omit<KeywordSuggestionParams, 'query'>): Promise<KeywordSuggestionResponse> {
    // Call keyword suggestions with empty query to get popular keywords
    return this.apiClient.getKeywordSuggestions({ ...params, query: '' })
  }
}

