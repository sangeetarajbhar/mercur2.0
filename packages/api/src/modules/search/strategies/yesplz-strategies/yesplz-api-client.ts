import axios, { AxiosInstance, AxiosError } from 'axios'

/**
 * YesPlz API Client Config
 */
export interface YesPlzApiClientConfig {
  apiUrl: string
  timeout: number
  retryAttempts?: number // Number of retry attempts (default: 3)
  retailerAdminKey?: string // API key for collections and admin endpoints
}

/**
 * YesPlz API Client
 * Handles all HTTP communication with YesPlz API including retries
 */
export class YesPlzApiClient {
  private client: AxiosInstance
  private config: YesPlzApiClientConfig

  constructor(config: YesPlzApiClientConfig) {
    this.config = config
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add Authorization header if retailer_admin_key is provided
    if (config.retailerAdminKey) {
      headers['Authorization'] = `Token ${config.retailerAdminKey}`
    }

    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout,
      headers
    })

    // Setup retry interceptor for all requests
    this.setupRetryInterceptor(config.retryAttempts ?? 3)
  }

  /**
   * Setup retry interceptor with exponential backoff
   * Retries on network errors, 5xx errors, and 429 (rate limit)
   */
  private setupRetryInterceptor(maxRetries: number): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any

        // Skip retry if already attempted or no config
        if (!config) {
          return Promise.reject(error)
        }

        // Initialize retry count
        config.__retryCount = config.__retryCount || 0

        // Determine if we should retry
        const status = error.response?.status
        const shouldRetry =
          config.__retryCount < maxRetries &&
          (status === undefined || // Network errors
           status === 429 || // Rate limit
           (status >= 500 && status < 600)) // Server errors

        if (shouldRetry) {
          config.__retryCount += 1

          // Exponential backoff: delay = 1000ms * 2^(retryCount - 1)
          const delay = 1000 * Math.pow(2, config.__retryCount - 1)

          await new Promise((resolve) => setTimeout(resolve, delay))

          // Retry the request
          return this.client(config)
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * Get a single product by ID
   * GET /api/v1/zilo/products/{productId}
   * @throws Error if product is not found (404) or other HTTP errors occur
   */
  async getProduct(productId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v1/zilo/products/${productId}`)
      return response.data
    } catch (error: unknown) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status
      const responseData = axiosError.response?.data as { message?: string } | undefined
      const errorMessage = responseData?.message || 
                          axiosError.message || 
                          'Unknown error'
      
      if (status === 404) {
        throw new Error(`Product not found: ${productId} - ${errorMessage}`)
      }
      
      throw axiosError
    }
  }

  /**
   * List products with pagination and search capabilities (unified endpoint)
   * GET /api/v1/zilo/products/
   * Handles both simple listing and advanced search with filters
   * 
   * @param params - Query parameters (can include search query, filters, sorting, etc.)
   */
  async listProducts(params?: {
    q?: string
    limit?: number
    offset?: number
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
    [key: string]: any
  }): Promise<{
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
  }> {
    try {
      const response = await this.client.get('/api/v1/zilo/products/', { params })
      return response.data
    } catch (error: unknown) {
      const axiosError = error as AxiosError
      throw axiosError
    }
  }

  /**
   * Send webhook to YesPlz
   * POST /api/v1/zilo/webhook
   * Retries are handled automatically by the retry interceptor
   * 
   * @param payload - Webhook payload
   * @param signature - HMAC signature for the payload
   * @returns Response data from YesPlz
   * @throws AxiosError if request fails after retries
   */
  async sendWebhook(payload: object, signature: string): Promise<any> {
    try {
      const response = await this.client.post(
        '/api/v1/zilo/webhook',
        payload,
        {
          headers: {
            'x-zilo-signature': signature
          }
        }
      )
      return response.data
    } catch (error: unknown) {
      const axiosError = error as AxiosError
      throw axiosError
    }
  }

  /**
   * List collections from YesPlz API
   * GET /api/v1/zilo/collections/
   * Requires retailer_admin_key for authentication
   * 
   * @param params - Query parameters for filtering and pagination
   * @returns Collection list response
   */
  async listCollections(params?: {
    search?: string
    status?: string
    sort?: string
    page?: number
    page_size?: number
    offset?: number
    limit?: number
  }): Promise<{
    totalCount: number
    totalCountRepresentation?: string
    hasNextPage: boolean
    results: Array<{
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
    }>
    pagination: {
      currentPage: number
      pageSize: number
      totalPages: number
      offset: number
    }
  }> {
    try {
      const response = await this.client.get('/api/v1/zilo/collections/', { params })
      return response.data
    } catch (error: unknown) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status
      const responseData = axiosError.response?.data as { message?: string } | undefined
      const errorMessage = responseData?.message || 
                          axiosError.message || 
                          'Unknown error'
      
      if (status === 401 || status === 403) {
        throw new Error(`Authentication failed: ${errorMessage}`)
      }
      
      throw axiosError
    }
  }

  /**
   * Get keyword suggestions from YesPlz API
   * GET /api/v1/zilo/keywordsuggestion
   * Public endpoint - no authentication required
   * 
   * @param params - Query parameters for keyword suggestions
   * @returns Keyword suggestion response
   */
  async getKeywordSuggestions(params?: {
    query?: string // Search prefix (max 128 chars). Empty = popular keywords
    top_category?: string // Filter by category (e.g., "Women", "Men", "ALL")
    lang?: string // Language code ("en", "ko", etc.)
    count?: number // Number of suggestions to return (max 50)
    sale?: string // Filter by sale status ("all", "true", "false")
    pinned?: boolean // Include admin-pinned keywords at specified ranks
    detail?: boolean // Include purchase stats for each keyword
    days?: number // Days of stats to aggregate (1-90, requires detail=true)
  }): Promise<{
    count: number
    results: Array<{
      suggestion: string
      [key: string]: any // Additional fields when detail=true
    }>
    message?: string // Optional error message from API
  }> {
    try {
      const response = await this.client.get('/api/v1/zilo/keywordsuggestion', { params })
      return response.data
    } catch (error: unknown) {
      const axiosError = error as AxiosError
      throw axiosError
    }
  }
}

