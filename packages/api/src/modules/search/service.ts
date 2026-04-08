import { MedusaContainer } from '@medusajs/framework'
import { logger } from '@medusajs/framework/logger'
import { ContainerRegistrationKeys, QueryContext } from '@medusajs/framework/utils'
import { SearchProviderStrategy, SearchQuery, SearchResult, SearchProduct } from './types'
import { createAllSearchStrategies } from './search-product-factory'
import { wrapVariantsWithSellerPricing } from '../../api/utils/middlewares/products/variant-seller-pricing'
import {
  selectProductsAvailableLocationsBatch
} from '../../subscribers/utils/algolia-product'
import { constructS3Url } from '../../shared/utils/common'

// SearchModuleOptions interface removed - no options needed
// Strategies are initialized internally, not passed in

/**
 * Search Module Service
 * Main service for managing product search indexing across multiple providers
 * Uses strategy pattern to support multiple search services (YesPlz, Algolia, etc.)
 * 
 * Strategies are initialized automatically based on environment variables.
 * The subscriber doesn't need to know about specific strategies.
 */
export default class SearchModuleService {
  private searchProvider: SearchProviderStrategy | null = null
  private initialized: boolean = false

  constructor() {
    // Provider will be initialized lazily when productPublish is called
  }

  /**
   * Initialize search provider based on environment variables
   * Called automatically on first use (lazy initialization)
   * Matches proposed architecture: single SearchProvider
   */
  private initializeProvider(container: MedusaContainer): void {
    if (this.initialized) {
      return // Already initialized
    }

    this.initialized = true

    // Use factory to create provider (gets first enabled provider)
    const createdStrategies = createAllSearchStrategies(container)
    // Set first enabled provider (matches single provider architecture)
    this.searchProvider = createdStrategies.length > 0 ? createdStrategies[0] : null

  }

  /**
   * Ensure provider is initialized and available
   * Throws error if no provider is configured
   */
  private ensureProviderInitialized(container: MedusaContainer): void {
    this.initializeProvider(container)

    if (!this.searchProvider) {
      throw new Error('[Search] No search provider configured - search provider is required')
    }
  }

  /**
   * Publish products to search provider
   * Matches proposed architecture exactly:
   * - Fetch products using graph.query(ids)
   * - Pass to searchProvider.publishProduct(products)
   * 
   * @param container - Medusa container
   * @param productIds - Array of product IDs to publish
   * @returns Promise that resolves when products are indexed
   */
  async productPublish(
    container: MedusaContainer,
    productIds: string[]
  ): Promise<void> {
    if (!productIds || productIds.length === 0) {
      return
    }

    // Ensure provider is initialized
    this.ensureProviderInitialized(container)

    // OPTIMIZED: Fetch products directly - fetchProducts already filters by status: 'published'
    // This removes redundant filterProductsByStatus query
    const products = await this.fetchProducts(container, productIds)

    if (products.length === 0) {
      return
    }

    // Pass fetched products to provider (matches proposed architecture)
    await this.searchProvider!.publishProduct(products)
  }

  /**
   * Unpublish products from search provider
   * Matches proposed architecture: pass product IDs to provider
   * 
   * @param container - Medusa container
   * @param productIds - Array of product IDs to unpublish
   * @returns Promise that resolves when products are removed
   */
  async unpublishProduct(
    container: MedusaContainer,
    productIds: string[]
  ): Promise<void> {
    if (!productIds || productIds.length === 0) {
      return
    }

    // Ensure provider is initialized
    this.ensureProviderInitialized(container)

    // Pass product IDs directly to provider (matches proposed architecture)
    await this.searchProvider!.unpublishProduct(productIds)
  }

  /**
   * Handle search indexing for product changes (event-driven)
   * Uses productPublish() and unpublishProduct() internally
   * Matches proposed architecture
   */
  async handleSearchChange(
    event: { data: { ids: string[] } },
    container: MedusaContainer
  ): Promise<void> {
    const uniqueProductIds = Array.from(new Set(event.data.ids ?? []))
    if (uniqueProductIds.length === 0) {
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['id', 'status', 'deleted_at'],
      filters: { id: uniqueProductIds }
    })

    const published = products
      .filter((p: any) => p.status === 'published' && !p.deleted_at)
      .map((p: any) => p.id)

    const inactive = products
      .filter((p: any) => p.status !== 'published' && !p.deleted_at)
      .map((p: any) => p.id)

    const deleted = products
      .filter((p: any) => Boolean(p.deleted_at))
      .map((p: any) => p.id)

    // Use productPublish + syncUpdateIsActive + unpublishProduct
    // Note: syncUpdateIsActive returns counts, so we keep the promises type broad.
    const promises: Array<Promise<unknown>> = []

    if (published.length > 0) {
      promises.push(this.productPublish(container, published))
    }

    if (inactive.length > 0) {
      promises.push(
        this.syncUpdateIsActive(
          container,
          inactive.map((productId) => ({ productId, isActive: false }))
        )
      )
    }

    if (deleted.length > 0) {
      promises.push(this.unpublishProduct(container, deleted))
    }

    await Promise.all(promises)
  }

  /**
   * List products from the active search provider
   * This is a shared method that frontend endpoints can use
   * It delegates to the currently active strategy's listProducts method
   * Now handles both simple listing and advanced search with filters
   * 
   * @param container - Medusa container
   * @param query - SearchQuery parameters for filtering/listing products (can include search query, filters, sorting, etc.)
   * @returns Promise that resolves with product list response
   */
  async listProducts(
    container: MedusaContainer,
    query: SearchQuery
  ): Promise<SearchResult<SearchProduct>> {
    // Ensure provider is initialized
    this.ensureProviderInitialized(container)

    // Delegate to the active strategy's listProducts method
    return this.searchProvider!.listProducts(query)
  }

  /**
   * List collections from the active search provider
   * This is a shared method that frontend endpoints can use
   * It delegates to the currently active strategy's listCollections method
   * 
   * @param container - Medusa container
   * @param params - Optional parameters for filtering/listing collections (can include search query, status, sorting, pagination, etc.)
   * @returns Promise that resolves with collection list response
   */
  async listCollections(
    container: MedusaContainer,
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Ensure provider is initialized
    this.ensureProviderInitialized(container)

    // Check if provider supports listCollections
    if (!this.searchProvider!.listCollections) {
      throw new Error('[Search] Collections listing is not supported by the current search provider')
    }

    // Delegate to the active strategy's listCollections method
    // Type assertion needed because interface uses generic types
    return this.searchProvider!.listCollections(params) as Promise<Record<string, unknown>>
  }

  /**
   * Get keyword suggestions from the active search provider
   * This is a shared method that frontend endpoints can use
   * It delegates to the currently active strategy's getKeywordSuggestions method
   * 
   * @param container - Medusa container
   * @param params - Optional parameters for keyword suggestions (query, category, lang, count, etc.)
   * @returns Promise that resolves with keyword suggestion response
   */
  async getKeywordSuggestions(
    container: MedusaContainer,
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Ensure provider is initialized
    this.ensureProviderInitialized(container)

    // Check if provider supports getKeywordSuggestions
    if (!this.searchProvider!.getKeywordSuggestions) {
      throw new Error('[Search] Keyword suggestions are not supported by the current search provider')
    }

    // Delegate to the active strategy's getKeywordSuggestions method
    return this.searchProvider!.getKeywordSuggestions(params) as Promise<Record<string, unknown>>
  }

  /**
   * Get popular searches from the active search provider
   * This is a shared method that frontend endpoints can use
   * It delegates to the currently active strategy's getPopularSearches method
   * 
   * @param container - Medusa container
   * @param params - Optional parameters for popular searches (category, lang, count, etc.)
   * @returns Promise that resolves with popular search response
   */
  async getPopularSearches(
    container: MedusaContainer,
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Ensure provider is initialized
    this.ensureProviderInitialized(container)

    // Check if provider supports getPopularSearches
    if (!this.searchProvider!.getPopularSearches) {
      throw new Error('[Search] Popular searches are not supported by the current search provider')
    }

    // Delegate to the active strategy's getPopularSearches method
    return this.searchProvider!.getPopularSearches(params) as Promise<Record<string, unknown>>
  }


  /**
   * Sync product recommendation scores to the active search provider.
   * Delegates to provider.syncScores() — same pattern as productPublish, listProducts, etc.
   *
   * @param container - Medusa container
   * @param scoreMap  - Map of productId → final_score
   * @returns Sync results (updatedCount, failedCount, failedItems)
   */
  async syncScores(
    container: MedusaContainer,
    scoreMap: Map<string, number>
  ): Promise<{
    updatedCount: number
    failedCount: number
    failedItems: Array<{ product_id: string; error: string }>
  }> {
    if (!scoreMap || scoreMap.size === 0) {
      return { updatedCount: 0, failedCount: 0, failedItems: [] }
    }

    this.ensureProviderInitialized(container)

    if (!this.searchProvider!.syncScores) {
      throw new Error('[Search] Score syncing is not supported by the current search provider')
    }

    const SYNC_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours

    logger.debug(
      `[Search] syncScores started: ${scoreMap.size} products, timeout ${SYNC_TIMEOUT_MS}ms (5m)`
    )

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        const errMsg = '[Search] syncScores timed out after 5 minutes'
        logger.warn(`${errMsg} (total products: ${scoreMap.size})`)
        reject(new Error(errMsg))
      }, SYNC_TIMEOUT_MS)
    )

    const fetchProductsFn = (ids: string[]) => this.fetchProducts(container, ids)

    const resultPromise = this.searchProvider!.syncScores(scoreMap, fetchProductsFn)
    const result = await Promise.race([resultPromise, timeoutPromise])
    logger.debug(
      `[Search] syncScores completed: updated=${result.updatedCount} failed=${result.failedCount}`
    )
    return result
  }

  /**
   * Sync product inventory to the active search provider.
   * Delegates to provider.syncInventory() — same pattern as productPublish, listProducts, etc.
   *
   * @param container - Medusa container
   * @param productIds - Optional array of product IDs to sync
   * @returns Sync results (updatedCount, failedCount, failedItems)
   */
  async syncInventory(
    container: MedusaContainer,
    productIds?: string[]
  ): Promise<{
    updatedCount: number
    failedCount: number
    failedItems: Array<{ product_id: string; error: string }>
  }> {
    this.ensureProviderInitialized(container)

    if (!this.searchProvider!.syncInventory) {
      throw new Error('[Search] Inventory syncing is not supported by the current search provider')
    }

    const SYNC_TIMEOUT_MS =  2 * 60 * 60 * 1000 //2hrs 

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('[Search] syncInventory timed out after 15 minutes')),
        SYNC_TIMEOUT_MS
      )
    )

    const fetchProductsFn = (ids: string[]) => this.fetchProducts(container, ids)

    return Promise.race([
      this.searchProvider!.syncInventory(productIds, fetchProductsFn),
      timeoutPromise
    ])
  }

  /**
   * Sync product prices to the active search provider.
   * Delegates to provider.syncPrices() — same pattern as productPublish, listProducts, etc.
   *
   * @param container - Medusa container
   * @param productIds - Optional array of product IDs to sync
   * @returns Sync results (updatedCount, failedCount, failedItems)
   */
  async syncPrices(
    container: MedusaContainer,
    productIds?: string[]
  ): Promise<{
    updatedCount: number
    failedCount: number
    failedItems: Array<{ product_id: string; error: string }>
  }> {
    this.ensureProviderInitialized(container)

    if (!this.searchProvider!.syncPrices) {
      throw new Error('[Search] Price syncing is not supported by the current search provider')
    }

    const SYNC_TIMEOUT_MS =  2 * 60 * 60 * 1000 // 2hrs

    const scope = productIds?.length ? `ids=${productIds.length}` : 'all_published'
    logger.info(`[Search] syncPrices: starting scope=${scope} timeout=${SYNC_TIMEOUT_MS}ms (${Math.round(SYNC_TIMEOUT_MS / 60000)}min)`)

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`[Search] syncPrices timed out after ${Math.round(SYNC_TIMEOUT_MS / 60000)} minutes`)),
        SYNC_TIMEOUT_MS
      )
    )

    const fetchProductsFn = (ids: string[]) => this.fetchProducts(container, ids)

    const startMs = Date.now()
    try {
      const result = await Promise.race([
        this.searchProvider!.syncPrices(productIds, fetchProductsFn),
        timeoutPromise
      ])
      logger.info(`[Search] syncPrices: completed in ${Date.now() - startMs}ms updated=${result.updatedCount} failed=${result.failedCount}`)
      return result
    } catch (error: any) {
      logger.error(`[Search] syncPrices: FAILED after ${Date.now() - startMs}ms error=${error.message}`)
      throw error
    }
  }

  /**
   * Update product isActive in the active search provider (e.g. YesPlz isActive).
   * Delegates to provider.syncUpdateIsActive() — same pattern as syncInventory, syncPrices.
   *
   * @param container - Medusa container
   * @param products - Array of { productId, isActive } (status per product)
   * @returns Sync results (updatedCount, failedCount, failedItems)
   */
  async syncUpdateIsActive(
    container: MedusaContainer,
    products: Array<{ productId: string; isActive: boolean }>
  ): Promise<{
    updatedCount: number
    failedCount: number
    failedItems: Array<{ product_id: string; error: string }>
  }> {
    if (!products?.length) {
      return { updatedCount: 0, failedCount: 0, failedItems: [] }
    }

    this.ensureProviderInitialized(container)

    if (!this.searchProvider!.syncUpdateIsActive) {
      throw new Error('[Search] Update isActive is not supported by the current search provider')
    }

    const SYNC_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('[Search] syncUpdateIsActive timed out after 5 minutes')),
        SYNC_TIMEOUT_MS
      )
    )

    return Promise.race([
      this.searchProvider!.syncUpdateIsActive(products),
      timeoutPromise
    ])
  }

  /**
   * Fetch and format products (common for all strategies)
   * This avoids duplicate database queries when multiple strategies are enabled
   * Made public for use in scripts and other external callers
   */
  async fetchProducts(
    container: MedusaContainer,
    productIds: string[]
  ): Promise<any[]> {
    // CRITICAL FIX: Return early if productIds is empty to prevent fetching ALL products
    if (!productIds || productIds.length === 0) {
      return []
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Get default region for pricing
    const { data: regions } = await query.graph({
      entity: 'region',
      fields: ['id'],
      filters: {}
    })
    const regionId = regions?.[0]?.id
    const currencyCode = 'inr'

    // Fetch products with all necessary fields
    const { data: products } = await query.graph({
      entity: 'product',
      fields: [
        'id',
        'title',
        'subtitle',
        'description',
        'handle',
        'status',
        'thumbnail',
        'created_at',
        'metadata',
        'categories.id',
        'categories.name',
        'categories.handle',
        'categories.attributes.id',
        'categories.attributes.name',
        'categories.attributes.is_filterable',
        'tags.value',
        'type.value',
        'variants.id',
        'variants.title',
        'variants.sku',
        'variants.product_id',
        'variants.manage_inventory',
        'variants.options.id',
        'variants.options.value',
        'variants.options.option.id',
        'variants.options.option.title',
        'variants.metadata',
        'variants.calculated_price.*',
        'brand.name',
        'sellers.id',
        'options.id',
        'options.title',
        'options.values.value',
        'images.url',
        'images.rank',
        'attribute_values.value',
        'attribute_values.attribute.id',
        'attribute_values.attribute.name',
        'attribute_values.attribute.is_filterable',
        'product_configuration.is_try_and_buy'
      ],
      filters: {
        id: productIds,
        status: 'published',
        deleted_at: null
      },
      context: {
        variants: {
          calculated_price: QueryContext({
            region_id: regionId,
            currency_code: currencyCode,
          }),
        },
      },
    })

    if (!products || products.length === 0) {
      return []
    }

    // Same location logic as Algolia for product-level locations (used by Algolia and for pricing).
    // For YesPlz, per-variant DS locations are resolved separately using the provider's inventory helper.
    // const [parentLocationsMap, availableLocationsMap] = await Promise.all([
    //   selectProductsParentLocationsBatch(container, productIds),
    //   selectProductsAvailableLocationsBatch(container, productIds)
    // ])

    const [availableLocationsMap] = await Promise.all([
      selectProductsAvailableLocationsBatch(container, productIds)
    ])


    // If the active provider exposes a YesPlz-style inventory resolver, compute per-variant DS locations
    // so publish() can share the same inventory logic as syncInventory.
    let variantToDsLocations: Map<string, string[]> | null = null
    const providerAny = this.searchProvider as any
    if (providerAny && typeof providerAny.resolveVariantInventory === 'function') {
      const resolved = await providerAny.resolveVariantInventory(query, products)
      if (resolved && resolved.variantToDsLocations instanceof Map) {
        variantToDsLocations = resolved.variantToDsLocations
        logger.debug(
          `[Search] Resolved DS locations for ${resolved.variantToDsLocations.size} variant(s)`
        )
      }
    }

    // Format products with common data (pricing, locations, filters)
    const formattedProducts: any[] = []

    for (const product of products) {
      // Use Algolia-style product-level locations (parent only) for available_locations
        // const parentLocations = parentLocationsMap.get(product.id) ?? []
        // product.available_locations = parentLocations

      if (product.variants && product.variants.length > 0) {
        // Per-variant locations:
        // - If YesPlz inventory resolver is available, use DS-only locations per variant
        // - Otherwise, fall back to Algolia-style product-level locations for all variants
        if (variantToDsLocations) {
          product.variants.forEach((variant: any) => {
            const dsLocs = variantToDsLocations!.get(variant.id) || []
            variant.available_locations = dsLocs
          })
        } 

        // Expanded locations for pricing (same as Algolia)
        const locationIdsForPricing = availableLocationsMap.get(product.id)
        const extraData =
          locationIdsForPricing && locationIdsForPricing.length > 0
            ? { location_ids: locationIdsForPricing, filterToSingleSeller: false }
            : { filterToSingleSeller: false }

        await wrapVariantsWithSellerPricing(
          container,
          product.variants,
          { currency_code: currencyCode },
          extraData
        )
      }

      // Build filters from attribute_values
      const filters = this.extractFilters(product)
      logger.debug(
        `[Search] Extracted filters for product ${product.id}: ${Object.keys(filters).join(', ') || 'none'}`
      )

      // Sort images by rank and resolve full S3 URLs
      const sortedImages = (product.images || [])
        .filter((img: any) => img?.url)
        .sort((a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0))
        .map((img: any) => ({ ...img, url: constructS3Url(img.url) }))

      // Format product with common fields (price/mrp use same logic as price sync)
      const { price, mrp, sellerId } = this.getPriceAndMrpFromMinPriceVariant(product)
      const formattedProduct = {
        id: product.id,
        title: product.title,
        subtitle: product.subtitle,
        description: product.description,
        handle: product.handle,
        status: product.status,
        images: sortedImages,
        options: product.options,
        variants: product.variants || [],
        categories: product.categories || [],
        attribute_values: product.attribute_values || [],
        filters,
        price_asc: this.getMinPrice(product.variants),
        price_max: this.getMaxPrice(product.variants),
        price,
        mrp,
        brand: product.brand?.name,
        type: product.type?.value,
        collection: product.tags?.find((t: any) => t.value)?.value,
        metadata: product.metadata,
        thumbnail: product.thumbnail ? constructS3Url(product.thumbnail) : undefined,
        created_at: product.created_at,
        is_try_and_buy: product.product_configuration?.is_try_and_buy ?? true,
        seller: {
          sellerId: sellerId
        }
      }

      formattedProducts.push(formattedProduct)
    }

    return formattedProducts
  }

  /**
   * Extract filters from product attribute_values
   */
  private extractFilters(product: any): Record<string, string[]> {
    const filters: Record<string, string[]> = {}
    const categoryFilterableAttributeIds = new Set<string>()
    const allCategoryLinkedAttributeIds = new Set<string>()

    if (product.categories?.length) {
      for (const category of product.categories) {
        for (const attr of category.attributes || []) {
          if (!attr?.id) {
            continue
          }
          allCategoryLinkedAttributeIds.add(attr.id)
          if (attr.is_filterable) {
            categoryFilterableAttributeIds.add(attr.id)
          }
        }
      }
    }

    if (product.attribute_values) {
      for (const attr of product.attribute_values) {
        if (!attr?.attribute?.is_filterable || !attr.value) {
          continue
        }

        const attributeId = attr.attribute?.id
        const hasNoCategories = !product.categories || product.categories.length === 0
        const isGlobalAttribute =
          !!attributeId && !allCategoryLinkedAttributeIds.has(attributeId)
        const isCategorySpecificAttribute =
          !!attributeId && categoryFilterableAttributeIds.has(attributeId)

        if (!hasNoCategories && !isGlobalAttribute && !isCategorySpecificAttribute) {
          continue
        }

        const key = attr.attribute?.name?.toLowerCase()?.replace(/\s+/g, '_') || ''
        if (key) {
          if (!filters[key]) {
            filters[key] = []
          }
          if (!filters[key].includes(attr.value)) {
            filters[key].push(attr.value)
          }
        }
      }
    }

    return filters
  }

  /**
   * Extract price from variant's calculated_price
   * Handles both direct calculated_amount and seller_prices
   */
  private extractVariantPrice(variant: any): number[] {
    const calculatedPrice = variant.calculated_price
    if (!calculatedPrice) return [0]

    // Direct calculated_amount
    // if (calculatedPrice.calculated_amount) {
    //   return [calculatedPrice.calculated_amount]
    // }

    // Extract from seller_prices
    if (calculatedPrice.seller_prices) {
      const sellerPrices = Object.values(calculatedPrice.seller_prices) as any[]
      return sellerPrices
        .map((sp: any) => sp.calculated_amount)
        .filter((amt: any) => amt != null)
    }

    return [0]
  }

  /**
   * Get minimum price from variants
   */
  private getMinPrice(variants: any[]): number {
    if (!variants || variants.length === 0) return 0

    const prices = variants
      .flatMap((v: any) => this.extractVariantPrice(v))
      .filter((p: number) => p > 0)

    return prices.length > 0 ? Math.min(...prices) : 0
  }

  /**
   * Get maximum price from variants
   */
  private getMaxPrice(variants: any[]): number {
    if (!variants || variants.length === 0) return 0

    const prices = variants
      .flatMap((v: any) => this.extractVariantPrice(v))
      .filter((p: number) => p > 0)

    return prices.length > 0 ? Math.max(...prices) : 0
  }

  /**
   * Get price and MRP for a product using the same logic as price sync (syncPrices):
   * - Resolve the min-price variant (variant with lowest price via min_price_seller_id → seller_prices[sellerId].calculated_amount)
   * - From that variant, use min_price_seller_id and seller_prices[sellerId]
   * - price = sellerPrice.calculated_amount, mrp = sellerPrice.original_amount (fallback to calculated_amount)
   * Used by fetchProducts so full sync and price sync use identical price/mrp.
   */
  private getPriceAndMrpFromMinPriceVariant(product: any): { price: number; mrp: number; sellerId: string } {
    const variants = product.variants || []
    if (variants.length === 0) return { price: 0, mrp: 0, sellerId: '' }

    let minPrice = Infinity
    let minPriceVariant: any = null

    for (const variant of variants) {
      const cp = variant.calculated_price
      if (!cp) continue

      let variantMinPrice: number | null = null
      if (cp.min_price_seller_id && cp.seller_prices?.[cp.min_price_seller_id]) {
        const amt = cp.seller_prices[cp.min_price_seller_id].calculated_amount
        if (amt != null) variantMinPrice = amt
      }
      if (variantMinPrice == null && typeof cp.calculated_amount === 'number') {
        variantMinPrice = cp.calculated_amount
      }

      if (variantMinPrice != null && variantMinPrice < minPrice) {
        minPrice = variantMinPrice
        minPriceVariant = variant
      }
    }

    if (!minPriceVariant || minPrice === Infinity) return { price: 0, mrp: 0, sellerId: '' }

    const cp = minPriceVariant.calculated_price
    const sellerId = cp?.min_price_seller_id
    const sellerPrice =
      sellerId && cp?.seller_prices?.[sellerId] ? cp.seller_prices[sellerId] : null

    if (!sellerPrice) {
      const fallback = cp?.calculated_amount
      return {
        price: typeof fallback === 'number' ? fallback : 0,
        mrp: typeof fallback === 'number' ? fallback : 0,
        sellerId: ''
      }
    }

    const price = sellerPrice.calculated_amount ?? 0
    const mrp = sellerPrice.original_amount ?? price
    return { price, mrp, sellerId: sellerId != null ? String(sellerId) : '' }
  }

}

