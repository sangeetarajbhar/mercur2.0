// ============================================================================
// Product Type Definitions
// ============================================================================

/**
 * Product image structure
 */
export interface ProductImage {
  url: string
  rank?: number
}

/**
 * Product variant option value
 */
export interface VariantOption {
  id: string
  value: string
  option: {
    id: string
    title: string
  }
}

/**
 * Calculated price structure
 */
export interface CalculatedPrice {
  calculated_amount?: number
  original_amount?: number
  seller_prices?: Record<string, {
    calculated_amount: number
    original_amount?: number
  }>
  is_calculated_price_tax_inclusive?: boolean
}

/**
 * Product variant structure
 */
export interface ProductVariant {
  id: string
  title?: string
  sku?: string
  product_id: string
  manage_inventory?: boolean
  inventory_quantity?: number
  options?: VariantOption[]
  calculated_price?: CalculatedPrice
  available_locations?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Product category structure
 */
export interface ProductCategory {
  id: string
  name: string
  handle?: string
  attributes?: Array<{
    name: string
    value: string
  }>
}

/**
 * Product attribute value structure
 */
export interface ProductAttributeValue {
  value: string
  attribute: {
    id: string
    name: string
    is_filterable?: boolean
  }
}

/**
 * Product tag structure
 */
export interface ProductTag {
  value: string
}

/**
 * Product brand structure
 */
export interface ProductBrand {
  name: string
}

/**
 * Product type structure
 */
export interface ProductType {
  value: string
}

/**
 * Coupon description structure
 */
export interface CouponDescription {
  description: string
  couponCode?: string
  bestPrice?: number
  bestPriceText?: string
}

/**
 * Coupon data structure
 */
export interface CouponData {
  couponDiscount?: number
  couponCode?: string
  couponDescription?: CouponDescription
}

/**
 * Search Product - Standard format used across search providers
 * This is the contract for what a product looks like in the search system
 */
export interface SearchProduct {
  id: string
  title: string
  subtitle?: string
  description?: string
  handle?: string
  status?: string
  images?: ProductImage[]
  options?: Array<{ title?: string; values?: Array<{ value?: string }> }>
  variants: ProductVariant[]
  categories?: ProductCategory[]
  attribute_values?: ProductAttributeValue[]
  filters?: Record<string, string[]>
  price_asc: number
  price_max?: number
  /** Resolved price (final/selling) using same logic as price sync; set by fetchProducts */
  price?: number
  /** Resolved MRP (original amount) using same logic as price sync; set by fetchProducts */
  mrp?: number
  brand?: string
  type?: string
  collection?: string
  category?: string // Fallback category name
  masterCategory?: string // Fallback master category name
  metadata?: Record<string, unknown>
  thumbnail?: string
  created_at?: string | Date
  // couponData?: CouponData
  available_locations?: string[]
  /** From product_configuration; default true when missing (matches product_configuration model) */
  is_try_and_buy?: boolean
  seller?: {
    sellerId: string
  }
}

/**
 * Medusa Container type (from framework)
 */
export type MedusaContainer = {
  resolve<T>(key: string): T
}

// ============================================================================
// Search Provider Strategy Interface
// ============================================================================

/**
 * Search Provider Strategy Interface
 * Matches the proposed architecture where strategies receive already-fetched products
 * 
 * This interface defines the contract for indexing products to search/indexing services.
 * Products are fetched by SearchService and passed to strategies.
 */
export interface SearchProviderStrategy {
  /**
   * Publish products to the search service
   * Products are already fetched and formatted by SearchService
   * Strategy should transform and index products to the search provider
   * 
   * @param products - Array of formatted products from Medusa (already fetched)
   * @returns Promise that resolves when products are indexed
   */
  publishProduct(products: SearchProduct[]): Promise<void>

  /**
   * Unpublish products from the search service
   * Remove products from the search provider index
   * 
   * @param productIds - Array of product IDs to remove
   * @returns Promise that resolves when products are removed
   */
  unpublishProduct(productIds: string[]): Promise<void>

  /**
   * List products from the search provider API
   * This is used by frontend endpoints to fetch products from the search service
   * Now handles both simple listing and advanced search with filters
   * 
   * @param params - Optional parameters for filtering/listing products (can include search query, filters, sorting, etc.)
   * @returns Promise that resolves with product list response
   */
  listProducts(params?: SearchQuery): Promise<SearchResult<SearchProduct>>

  /**
   * List collections from the search provider API
   * This is used by frontend endpoints to fetch collections from the search service
   * 
   * @param params - Optional parameters for filtering/listing collections (can include search query, status, sorting, pagination, etc.)
   * @returns Promise that resolves with collection list response
   */
  listCollections?(params?: Record<string, unknown>): Promise<Record<string, unknown>>

  /**
   * Get keyword suggestions from the search provider API
   * This is used by frontend endpoints to fetch keyword suggestions for autocomplete
   * 
   * @param params - Optional parameters for keyword suggestions (query, category, lang, count, etc.)
   * @returns Promise that resolves with keyword suggestion response
   */
  getKeywordSuggestions?(params?: Record<string, unknown>): Promise<Record<string, unknown>>

  /**
   * Get popular searches from the search provider API
   * This is used by frontend endpoints to fetch popular search terms
   * 
   * @param params - Optional parameters for popular searches (category, lang, count, etc.)
   * @returns Promise that resolves with popular search response
   */
  getPopularSearches?(params?: Record<string, unknown>): Promise<Record<string, unknown>>

  /**
   * Sync product recommendation scores (e.g., popularity) to the search service.
   * Takes a map of productId → score and an optional fetchProducts callback used
   * for the full-update fallback when PATCH fails.
   *
   * @param scoreMap         - Map of productId → final_score
   * @param fetchProductsFn  - Callback to fetch full Medusa products by ID (for fallback)
   * @returns Promise that resolves with sync results
   */
  syncScores?(
    scoreMap: Map<string, number>,
    fetchProductsFn: (ids: string[]) => Promise<any[]>
  ): Promise<{
    updatedCount: number;
    failedCount: number;
    failedItems: Array<{ product_id: string; error: string }>;
  }>

  /**
   * Sync product inventory to the search service.
   * Can sync specific products or all products if no list is provided.
   * 
   * @param productIds      - Optional array of specific product IDs to sync
   * @param fetchProductsFn - Callback to fetch full Medusa products by ID (for fallback/retry logic)
   * @returns Promise that resolves with sync results
   */
  syncInventory?(
    productIds?: string[],
    fetchProductsFn?: (ids: string[]) => Promise<any[]>
  ): Promise<{
    updatedCount: number;
    failedCount: number;
    failedItems: Array<{ product_id: string; error: string }>;
  }>

  /**
   * Sync product prices to the search service.
   * Can sync specific products or all products if no list is provided.
   * 
   * @param productIds      - Optional array of specific product IDs to sync
   * @param fetchProductsFn - Callback to fetch full Medusa products by ID (for fallback/retry logic)
   * @returns Promise that resolves with sync results
   */
  syncPrices?(
    productIds?: string[],
    fetchProductsFn?: (ids: string[]) => Promise<any[]>
  ): Promise<{
    updatedCount: number;
    failedCount: number;
    failedItems: Array<{ product_id: string; error: string }>;
  }>

  /**
   * Update product isActive in the search service (e.g. YesPlz isActive).
   * @param products - Array of { productId, isActive } to update per product
   * @returns Promise that resolves with sync results
   */
  syncUpdateIsActive?(products: Array<{ productId: string; isActive: boolean }>): Promise<{
    updatedCount: number;
    failedCount: number;
    failedItems: Array<{ product_id: string; error: string }>;
  }>

  /**
   * Fetch products (optional - can be used for provider-specific fetching)
   * Most providers will use the common fetchProducts from SearchService
   * 
   * @param container - Medusa container
   * @param productIds - Array of product IDs to fetch
   * @returns Array of formatted products
   */
  fetchProducts?(container: MedusaContainer, productIds: string[]): Promise<SearchProduct[]>

  /**
   * Get the search service identifier name for logging purposes
   * @returns Service name (e.g., "YesPlz", "Algolia")
   */
  getServiceName(): string

  /**
   * Check if the search service is enabled and available
   * @returns true if service is enabled, false otherwise
   */
  isEnabled(): boolean
}

/**
 * Sort options - canonical values for PLP (YesPlz).
 * Order: recommended, popularity, newest, discount, price_asc, price_desc.
 */
export type SortOption =
  | 'recommended'   // Default - best match
  | 'popularity'   // Most popular/viewed
  | 'price_asc'    // Price low to high
  | 'price_desc'   // Price high to low
  | 'newest'       // Newest arrival
  | 'discount'     // Highest discount first

/**
 * Pagination parameters
 */
export interface PaginationParams {
  offset: number
  limit: number
}

/**
 * Generic filters for facet-based filtering
 * Common filters that most providers support
 */
export interface GenericFilters {
  // Common filters that most providers support
  category?: string | string[]
  brand?: string | string[]
  color?: string | string[]
  size?: string | string[]
  gender?: string | string[]

  // Dynamic filters - provider will map these
  [key: string]: string | string[] | undefined
}

/**
 * Complete search query structure
 */
export interface SearchQuery {
  q?: string
  pagination: PaginationParams
  sort: SortOption
  filters?: GenericFilters // Facet filters (color, size, etc.)
  location?: string
}

// ============================================================================
// Response Types (Provider-Agnostic)
// ============================================================================

/**
 * Facet value with count and metadata
 */
export interface FacetValue {
  value: string
  count: number
  selected?: boolean
  // Provider can add extra metadata here
  metadata?: Record<string, unknown>
}

/**
 * Search facets - grouped filter values
 */
export interface SearchFacets {
  [facetName: string]: FacetValue[]
}

/**
 * Sort option information
 */
export interface SortOptionInfo {
  value: SortOption
  label: string
  selected: boolean
}

/**
 * Search result with pagination and facets
 */
export interface SearchResult<T = SearchProduct> {
  hits: T[]
  totalCount: number
  hasNextPage: boolean
  pagination: {
    offset: number
    limit: number
    totalPages: number
    currentPage: number
  }
  facets?: SearchFacets
  sortOptions?: SortOptionInfo[]
  /** Provider-native filters (e.g. YesPlz savedFilters + primaryFilters) */
  filters?: {
    savedFilters?: unknown[]
    primaryFilters?: unknown[]
  }
}

// ============================================================================
// Product Transformer Interface
// ============================================================================

/**
 * Product transformer interface
 * Defines the contract for transforming products from one format to another
 * 
 * @template TInput - Input product type (defaults to SearchProduct)
 * @template TOutput - Output product type (provider-specific format)
 */
export interface IProductTransformer<TInput = SearchProduct, TOutput = SearchProduct> {
  /**
   * Transform a single product
   * @param product - Input product to transform
   * @returns Transformed product or null if transformation fails
   */
  transform(product: TInput): TOutput | null

  /**
   * Transform multiple products in batch
   * @param products - Array of input products to transform
   * @returns Array of transformed products (null values are filtered out)
   */
  transformBatch(products: TInput[]): TOutput[]
}

