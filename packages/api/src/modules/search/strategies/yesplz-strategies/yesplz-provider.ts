import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { SearchProviderStrategy, SearchQuery, SearchResult, SearchProduct, SortOption } from '../../types'
import { yesPlzProductTransformer } from './yesplz-product-transformer'
import { YesPlzService, YesPlzServiceOptions, ListProductsParams, ListCollectionsParams, KeywordSuggestionParams } from './yesplz-service'
import { calculateProductPromotions } from '../../../../api/store/product-list/utils/calculate-product-promotions'
import priceExtendLink from '../../../../links/price-extend-price'
import { LocationType } from '../../../../modules/stock-location-extension/types/common'
import { RemoteQueryFilters } from '@mercurjs/types'

// Constants
const DEFAULT_BATCH_SIZE = 20
const DEFAULT_BEST_PRICE_TEXT = 'Best Price'
const ERROR_PREFIX = '[YesPlz]'

/** Hidden gender values; their counts are redistributed to visible values per GENDER_REDISTRIBUTION_MAP */
const GENDER_REDISTRIBUTION_MAP: Record<string, string[]> = {
  unisex: ['men', 'women'],
  kids: ['girls', 'boys']
}
const HIDDEN_GENDER_VALUES = Object.keys(GENDER_REDISTRIBUTION_MAP)

/** Canonical sort options for PLP; order and display names match store expectations */
const CANONICAL_SORT_OPTIONS = [
  { value: 'recommended', displayName: 'Recommended', selected: false },
  { value: 'popularity', displayName: 'Popularity', selected: false },
  { value: 'newest', displayName: 'Newest Arrival', selected: false },
  { value: 'discount', displayName: 'Discount', selected: false },
  { value: 'price_asc', displayName: 'Price: Low to High', selected: false },
  { value: 'price_desc', displayName: 'Price: High to Low', selected: false },
] as const

// Error message constants
const ERRORS = {
  SERVICE_NOT_INITIALIZED: (action: string) => `${ERROR_PREFIX} Service not initialized - cannot ${action}`,
  MISSING_CONFIG: `${ERROR_PREFIX} YesPlz service requires apiUrl and webhookSecret to be configured`,
  INIT_FAILED: (msg: string) => `${ERROR_PREFIX} Failed to initialize YesPlz service: ${msg}`,
  OPTIONS_REQUIRED: `${ERROR_PREFIX} YesPlz provider requires options to be provided`
} as const

/** Per-product error from publishProductAndCollectErrors */
export type PublishProductError = {
  productId: string
  error: string
  timestamp: string
  /** The exact payload sent to YesPlz (product.updated) */
  payload: any
  /** Convenience/debug fields derived from payload */
  sizes?: string
  inventoryInfoCount?: number
  duplicateSizeLabels?: string[]
  skuIds?: string[]
}

/**
 * YesPlz Search Provider
 * Implements SearchProviderStrategy according to proposed architecture
 * 
 * Products are fetched by SearchService and passed to publishProduct().
 * This provider handles YesPlz-specific transformation and indexing.
 */
export class YesPlzSearchProvider implements SearchProviderStrategy {
  private yesplzService: YesPlzService | null = null
  private container: MedusaContainer
  private options: YesPlzServiceOptions | null = null

  constructor(container: MedusaContainer, options?: YesPlzServiceOptions) {
    this.container = container

    if (!options) {
      throw new Error(ERRORS.OPTIONS_REQUIRED)
    }

    if (!options.apiUrl || !options.webhookSecret) {
      throw new Error(ERRORS.MISSING_CONFIG)
    }

    try {
      this.options = options
      this.yesplzService = new YesPlzService(options)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(ERRORS.INIT_FAILED(errorMessage))
    }
  }


  /**
   * Check if an error indicates a duplicate key constraint violation
   * This means the product already exists in YesPlz database
   */
  private isDuplicateKeyError(error: any): boolean {
    const errorMessage = (error?.message || error?.error || '').toLowerCase()
    return errorMessage.includes('duplicate key') ||
      errorMessage.includes('unique constraint') ||
      errorMessage.includes('already exists')
  }

  /**
   * Calculate promotions and add couponData to products
   */
  private async enrichProductsWithCouponData(products: any[]): Promise<any[]> {
    if (products.length === 0) {
      return products
    }

    // Prepare products for promotion calculation
    const productsForPromotionCalc = products.map((product: any) => ({
      id: product.id,
      price_asc: product.price_asc || 0,
      title: product.title || null
    }))

    // Calculate promotions
    let promotionMap = new Map<string, any>()
    try {
      const promotionResults = await calculateProductPromotions(
        productsForPromotionCalc,
        this.container,
        undefined // customerId - can be passed if available in future
      )
      promotionMap = new Map(promotionResults.map(p => [p.product_id, p]))
    } catch {
      // Continue without coupon data if promotion calculation fails
    }

    // Add couponData to products
    // sangeeta : commented out for couponData as we are not using coupon data in yesplz
    return products.map((product: any) => {
      const promotionInfo = promotionMap.get(product.id)

      if (promotionInfo?.best_promotion_code) {
        // const discountPercentage = promotionInfo.original_price > 0
        //   ? Math.round((promotionInfo.discount_amount / promotionInfo.original_price) * 100)
        //   : 0
        
        product.couponData = {
          couponDiscount: promotionInfo.discount_amount,
          couponCode: promotionInfo.best_promotion_code,
          couponDescription: {
            // description: `Save ${discountPercentage}% using code ${promotionInfo.best_promotion_code}`,
            description: `Get it for ${promotionInfo.discounted_price} with code ${promotionInfo.best_promotion_code}`,
            couponCode: promotionInfo.best_promotion_code,
            bestPrice: promotionInfo.discounted_price,
            bestPriceText: DEFAULT_BEST_PRICE_TEXT
          }
        }
      }

      return product
    })
  }

  /**
   * Fetch discount percentages for given price IDs using the link to ExtendPrice
   * Same logic as data-for-sorting.ts
   */
  private async getPriceDiscounts(priceIdsArray: string[]): Promise<Record<string, number | null>> {
    if (!priceIdsArray.length) return {}

    const query = this.container.resolve(ContainerRegistrationKeys.QUERY)
    
    const pricesWithDiscount = await query.graph({
      entity: priceExtendLink.entryPoint, 
      fields: ["extend_price.percentage_discount", "price.*"],
      filters: { price_id : { $in: priceIdsArray } }
    })

    const discountMap: Record<string, number | null> = {}

    pricesWithDiscount.data.forEach((p: any) => {
      const priceId = p.price_id || p.price?.id
      const discount = p.extend_price?.percentage_discount ?? null

      if (priceId) {
        discountMap[priceId] = discount
      }
    })
    return discountMap
  }

  /**
   * Enrich products with discount percentages from database
   * Uses getPriceAndMrpFromMinPriceVariant to get price_id, then fetches discount from database
   * Adds discount_percentage to each product object
   * Single source of truth: uses getPriceAndMrpFromMinPriceVariant for price, mrp, and discount
   */
  private async enrichProductsWithDiscountPercentages(products: any[]): Promise<any[]> {
    if (!products.length) return products

    try {
      // Collect all price IDs from products using getPriceAndMrpFromMinPriceVariant (single call per product)
      const priceIdsArray: string[] = []
      const productPriceIdMap = new Map<string, string>()

      for (const product of products) {
        const { price_id } = this.getPriceAndMrpFromMinPriceVariant(product)
        if (price_id) {
          priceIdsArray.push(price_id)
          productPriceIdMap.set(product.id, price_id)
        }
      }

      // Fetch discount percentages from database
      const uniquePriceIds = [...new Set(priceIdsArray)]
      const discountMap = await this.getPriceDiscounts(uniquePriceIds)

      // Add discount_percentage to each product using cached price_id
      return products.map((product: any) => {
        const price_id = productPriceIdMap.get(product.id)
        
        if (price_id && discountMap[price_id] != null) {
          return { ...product, discount_percentage: discountMap[price_id] as number }
        }

        return { ...product, discount_percentage: undefined }
      })
    } catch (error) {
      this.resolveLogger().warn(`Failed to enrich products with discount percentages: ${error instanceof Error ? error.message : String(error)}`)
      return products
    }
  }

  /**
   * Transform products to YesPlz format with error handling
   * Uses the YesPlzProductTransformer class for batch transformation
   */
  private async transformProducts(products: any[]): Promise<any[]> {
    return yesPlzProductTransformer.transformBatch(products)
  }

  /**
   * Process a single product update/create with error handling
   * 404 errors are thrown as errors (not handled silently)
   */
  private async processProductUpdate(service: YesPlzService, yesplzProduct: any): Promise<void> {
    const productId = yesplzProduct.productId || yesplzProduct.id

    // Try to update first (most products will already exist)
    const updateResult = await service.sendProductUpdated(yesplzProduct)

    if (updateResult.success) {
      return // Update succeeded
    }

    // Update failed - throw error if not a duplicate key error
    if (!this.isDuplicateKeyError(updateResult)) {
      throw new Error(`Failed to update product ${productId}: ${updateResult.error}`)
    }
  }

  /**
   * Update product recommendation score using partial update
   * More efficient than sending full product - only sends product_id and final_score
   * 
   * @param productId - Product ID to update
   * @param finalScore - Final score/recommendation value
   */
  async updateProductRecommendationScore(productId: string, finalScore: number): Promise<void> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('update product recommendation score'))
    }

    try {
      const result = await this.yesplzService.sendProductRecommendationScoreUpdate(productId, finalScore)
      if (!result.success) {
        throw new Error(`Failed to update score for product ${productId}: ${result.error}`)
      }
    } catch (error: any) {
      this.resolveLogger().warn(
        `${ERROR_PREFIX} product.patched failed for ${productId}: ${error.message}`
      )
      throw error
    }
  }

  /**
   * Update product inventory only (variant-level) via partial update.
   * Sends only productId + inventoryInfo — no full product fetch needed.
   */
  async updateProductInventory(
    productId: string,
    inventoryInfo: Array<{
      skuId: string
      label: string
      available: boolean
      brandSizeLabel: string
      location: string[]
    }>
  ): Promise<void> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('update product inventory'))
    }
    
    const result = await this.yesplzService.sendProductInventoryUpdate(productId, inventoryInfo)
    if (!result.success) {
      throw new Error(`Failed to update inventory for product ${productId}: ${result.error}`)
    }
  }

  /**
   * Update product price (mrp and price) via partial update.
   * Sends productId, productName (YesPlz required), mrp, price.
   */
  async updateProductPrice(
    productId: string,
    mrp: number,
    price: number,
    sellerId: string,
    productName: string
  ): Promise<void> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('update product price'))
    }

    const result = await this.yesplzService.sendProductPriceUpdate(
      productId,
      mrp,
      price,
      sellerId,
      productName
    )
    if (!result.success) {
      throw new Error(`Failed to update price for product ${productId}: ${result.error}`)
    }
  }

  /**
   * Update product active state in YesPlz (e.g. mark inactive).
   * Sends product.updated with only productId and isActive.
   */
  async updateProductActiveState(productId: string, isActive: boolean): Promise<void> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('update product active state'))
    }

    const result = await this.yesplzService.sendProductActiveStateUpdate(productId, isActive)
    if (!result.success) {
      throw new Error(`Failed to update active state for product ${productId}: ${result.error}`)
    }
  }

  /**
   * Update product isActive in YesPlz per product.
   * Sends product.updated with isActive for each product.
   * @param products - Array of { productId, isActive } (status per product)
   */
  async syncUpdateIsActive(products: Array<{ productId: string; isActive: boolean }>): Promise<{
    updatedCount: number
    failedCount: number
    failedItems: Array<{ product_id: string; error: string }>
  }> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('sync product active state'))
    }

    if (!products?.length) {
      return { updatedCount: 0, failedCount: 0, failedItems: [] }
    }

    const logger = this.resolveLogger()
    const batchSize = this.options?.batchSize || DEFAULT_BATCH_SIZE
    let updatedCount = 0
    const failedItems: Array<{ product_id: string; error: string }> = []

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(products.length / batchSize)
      logger.info(`${ERROR_PREFIX} syncUpdateIsActive batch ${batchNumber}/${totalBatches} (${batch.length} items)`)

      const results = await Promise.allSettled(
        batch.map((p) => this.updateProductActiveState(p.productId, p.isActive))
      )

      results.forEach((result, idx) => {
        const productId = batch[idx].productId
        if (result.status === 'fulfilled') {
          updatedCount++
        } else {
          const errorMessage = result.reason?.message ?? String(result.reason ?? 'Unknown error')
          logger.warn(`${ERROR_PREFIX} Update isActive failed for ${productId}: ${errorMessage}`)
          failedItems.push({ product_id: productId, error: errorMessage })
        }
      })
    }

    return { updatedCount, failedCount: failedItems.length, failedItems }
  }

  /**
   * Sync product recommendation scores to YesPlz.
   *
   * For each product in `scoreMap`:
   *   Primary  → product.patched webhook (only sends productId + final_score)
   *   Fallback → Full product.updated webhook for any product whose PATCH failed
   *              (fetches full product from Medusa then publishes)
   *
   * Processes in batches of BATCH_SIZE (20) to control concurrency.
   *
   * @param scoreMap - Map of productId → final_score
   */
  async syncScores(
    scoreMap: Map<string, number>,
    fetchProductsFn: (ids: string[]) => Promise<any[]>
  ): Promise<{
    updatedCount: number
    failedCount: number
    failedItems: Array<{ product_id: string; error: string }>
  }> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('sync scores'))
    }

    const logger = this.resolveLogger()
    const productIds = Array.from(scoreMap.keys())
    const batchSize = this.options?.batchSize || DEFAULT_BATCH_SIZE
    const totalBatches = Math.ceil(productIds.length / batchSize)

    logger.info(
      `${ERROR_PREFIX} syncScores started: ${productIds.length} products, batchSize=${batchSize}, totalBatches=${totalBatches}`
    )
    if (logger.debug) {
      logger.debug(`${ERROR_PREFIX} syncScores timeout: 5m (configured in SearchModuleService)`)
    }

    let updatedCount = 0
    const failedItems: Array<{ product_id: string; error: string }> = []
    const syncStartMs = Date.now()

    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1

      const batchStartMs = Date.now()
      logger.info(`${ERROR_PREFIX} syncScores batch ${batchNumber}/${totalBatches} (${batch.length} items)`)

      const patchResults = await Promise.allSettled(
        batch.map(async (productId) => {
          const score = scoreMap.get(productId) ?? 0
          await this.updateProductRecommendationScore(productId, score)
          return productId
        })
      )

      // Separate PATCH successes from PATCH failures
      const fallbackIds: string[] = []
      patchResults.forEach((result, idx) => {
        const productId = batch[idx]
        if (result.status === 'fulfilled') {
          updatedCount++
        } else {
          logger.warn(
            `${ERROR_PREFIX} PATCH failed for ${productId}, queuing fallback: ${result.reason?.message}`
          )
          fallbackIds.push(productId)
        }
      })

      // Fallback: full product.updated for failed items
      if (fallbackIds.length > 0) {
        logger.info(`${ERROR_PREFIX} Running full-update fallback for ${fallbackIds.length} products`)
        try {
          const fullProducts = await fetchProductsFn(fallbackIds)
          if (fullProducts.length > 0) {
            const productsWithScores = fullProducts.map((p: any) => {
              const score = scoreMap.get(p.id) ?? 0
              return { ...p, popularity: score, final_score: score }
            })
            await this.publishProduct(productsWithScores)
            productsWithScores.forEach(() => updatedCount++)
          }

          // Products not found in Medusa → mark failed
          const foundIds = new Set(fullProducts.map((p: any) => p.id))
          fallbackIds.forEach((productId) => {
            if (!foundIds.has(productId)) {
              failedItems.push({ product_id: productId, error: 'Product not found in Medusa for fallback update' })
            }
          })
        } catch (fallbackError: any) {
          logger.error(`${ERROR_PREFIX} Fallback batch failed: ${fallbackError.message}`)
          fallbackIds.forEach((productId) => {
            failedItems.push({
              product_id: productId,
              error: `Fallback update failed: ${fallbackError.message}`
            })
          })
        }
      }

      const batchElapsedMs = Date.now() - batchStartMs
      const totalElapsedMs = Date.now() - syncStartMs
      if (logger.debug) {
        const etaMs = batchElapsedMs > 0 ? (totalBatches - batchNumber) * batchElapsedMs : 0
        logger.debug(
          `${ERROR_PREFIX} syncScores batch ${batchNumber}/${totalBatches} done in ${batchElapsedMs}ms, ` +
            `totalElapsed=${totalElapsedMs}ms updatedSoFar=${updatedCount} etaMs=${etaMs}`
        )
      }
    }

    if (logger.debug) {
      logger.debug(
        `${ERROR_PREFIX} syncScores finished in ${Date.now() - syncStartMs}ms updated=${updatedCount} failed=${failedItems.length}`
      )
    }
    return { updatedCount, failedCount: failedItems.length, failedItems }
  }

  /**
   * Sync product inventory to YesPlz.
   *
   * @param productIds - Optional array of product IDs to sync specific products, otherwise syncs all.
   * @param fetchProductsFn - Callback to fetch full Medusa products by ID (for fallback)
   */
  async syncInventory(
    productIds?: string[],
    fetchProductsFn?: (ids: string[]) => Promise<any[]>
  ): Promise<{
    updatedCount: number
    failedCount: number
    failedItems: Array<{ product_id: string; error: string }>
  }> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('sync inventory'))
    }

    const logger = this.resolveLogger()
    const query = this.container.resolve(ContainerRegistrationKeys.QUERY)

    const PRODUCT_FETCH_PAGE_SIZE = 100
    const batchSize = this.options?.batchSize || DEFAULT_BATCH_SIZE
    const publishedFilter = { status: 'published', deleted_at: null }

    // Reuse shared inventory resolution helper so syncInventory and publish use identical logic.
    // Step 1: Fetch products (id + variants.id + basic fields) so we know which variants to resolve.
    const productFields = [
      'id',
      'variants.id',
      'variants.sku',
      'variants.title',
      'variants.manage_inventory',
      'variants.options.value',
      'variants.options.option.title'
    ] as const

    const allProducts: any[] = []

    if (productIds?.length) {
      logger.info(`${ERROR_PREFIX} Fetching inventory data for ${productIds.length} specific products`)
      const pageResults = await Promise.all(
        Array.from({ length: Math.ceil(productIds.length / PRODUCT_FETCH_PAGE_SIZE) }, (_, i) =>
          query.graph({
            entity: 'product',
            fields: [...productFields] as string[],
            filters: { id: productIds.slice(i * PRODUCT_FETCH_PAGE_SIZE, (i + 1) * PRODUCT_FETCH_PAGE_SIZE), ...publishedFilter } as RemoteQueryFilters<"product">
          })
        )
      )
      allProducts.push(...pageResults.flatMap(r => r.data))
    } else {
      logger.info(`${ERROR_PREFIX} Fetching inventory data for all published products`)
      let skip = 0
      while (true) {
        const { data: products } = await query.graph({
          entity: 'product',
          fields: [...productFields] as string[],
          filters: publishedFilter as RemoteQueryFilters<"product">,
          pagination: { skip, take: PRODUCT_FETCH_PAGE_SIZE }
        })
        allProducts.push(...products)
        if (products.length < PRODUCT_FETCH_PAGE_SIZE) break
        skip += products.length
      }
    }

    if (allProducts.length === 0) {
      return { updatedCount: 0, failedCount: 0, failedItems: [] }
    }

    // ---------- Shared inventory resolution: compute DS locations + availability per variant ----------
    const { variantToDsLocations, variantHasStock } = await this.resolveVariantInventory(
      query,
      allProducts
    )

    // ---------- Sync loop: no DB, only build payload and call YesPlz ----------
    let updatedCount = 0
    const failedItems: Array<{ product_id: string; error: string }> = []
    const totalBatches = Math.ceil(allProducts.length / batchSize)

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      logger.info(`${ERROR_PREFIX} syncInventory batch ${batchNumber}/${totalBatches} (${batch.length} items)`)

      const inventoryInfoByProductId = new Map<string, any[]>()

      const results = await Promise.allSettled(
        batch.map(async (product) => {
          const variants = product.variants || []
          const inventoryInfo = variants.map((variant: any) => {
            const sizeOption = (variant.options || []).find((opt: any) => (opt.option?.title || '').toLowerCase() === 'size')
            const sizeValue = sizeOption?.value
            const label = sizeValue || variant.title || ''

            const hasInventory = variantHasStock.get(variant.id) ?? false
            const noInventoryManagement = variant.manage_inventory === false
            const dsLocations = variantToDsLocations.get(variant.id) || []
            const available = hasInventory || noInventoryManagement || dsLocations.length > 0

            return {
              skuId: variant.id || variant.sku || '',
              label,
              available,
              brandSizeLabel: sizeValue || label,
              location: dsLocations
            }
          })

          inventoryInfoByProductId.set(product.id, inventoryInfo)
          await this.updateProductInventory(product.id, inventoryInfo)
        })
      )

      const retryCandidateProductIds: string[] = []

      results.forEach((result, index) => {
        const productId = batch[index]?.id ?? 'unknown'
        if (result.status === 'fulfilled') {
          updatedCount++
          return
        }

        const reason = result.status === 'rejected' ? result.reason : null
        const errorMessage = reason?.message ?? String(reason ?? 'Unknown error')
        const normalized = String(errorMessage).toLowerCase()

        const looksLikeMissingProductName =
          normalized.includes('productname') &&
          (normalized.includes('required') || normalized.includes('may not be null'))

        if (looksLikeMissingProductName && productId !== 'unknown') {
          retryCandidateProductIds.push(productId)
          return
        }

        logger.warn(`${ERROR_PREFIX} Failed inventory sync for product ${productId}: ${errorMessage}`)
        failedItems.push({ product_id: productId, error: errorMessage })
      })

      if (retryCandidateProductIds.length > 0 && fetchProductsFn) {
        logger.info(`${ERROR_PREFIX} Running full-update fallback for ${retryCandidateProductIds.length} inventory products`)
        try {
          const fullProducts = await fetchProductsFn(retryCandidateProductIds)
          if (fullProducts?.length) {
            await this.publishProduct(fullProducts)
          }

          const retryResults = await Promise.allSettled(
            retryCandidateProductIds.map(async (productId) => {
              const inventoryInfo = inventoryInfoByProductId.get(productId) ?? []
              await this.updateProductInventory(productId, inventoryInfo)
            })
          )

          retryResults.forEach((retryResult, retryIndex) => {
            const productId = retryCandidateProductIds[retryIndex] ?? 'unknown'
            if (retryResult.status === 'fulfilled') {
              updatedCount++
            } else {
              const reason = retryResult.status === 'rejected' ? retryResult.reason : null
              const errorMessage = reason?.message ?? String(reason ?? 'Unknown error')
              logger.error(`${ERROR_PREFIX} Fallback failed for product ${productId}: ${errorMessage}`)
              failedItems.push({ product_id: productId, error: errorMessage })
            }
          })
        } catch (error: any) {
          logger.error(`${ERROR_PREFIX} Fallback batch failed: ${error.message}`)
          retryCandidateProductIds.forEach((productId) => {
            failedItems.push({ product_id: productId, error: `Fallback failed: ${error.message}` })
          })
        }
      }
    }

    return { updatedCount, failedCount: failedItems.length, failedItems }
  }

  /**
   * Sync product prices to YesPlz.
   * Uses the same logic as storefront: min-price variant + min-price seller.
   * For each product: price = seller_prices[min_price_seller_id].calculated_amount,
   * mrp = seller_prices[min_price_seller_id].original_amount (fallback to calculated_amount).
   *
   * @param productIds - Optional array of product IDs to sync specific products, otherwise syncs all published.
   * @param fetchProductsFn - Callback to fetch full Medusa products by ID (includes variants with calculated_price, seller_prices, min_price_seller_id)
   */
  async syncPrices(
    productIds?: string[],
    fetchProductsFn?: (ids: string[]) => Promise<any[]>,
  ): Promise<{
    updatedCount: number
    failedCount: number
    failedItems: Array<{ product_id: string; error: string }>
  }> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('sync prices'))
    }

    if (!fetchProductsFn) {
      throw new Error(`${ERROR_PREFIX} syncPrices requires fetchProductsFn to resolve product pricing`)
    }

    const logger = this.resolveLogger()
    const query = this.container.resolve(ContainerRegistrationKeys.QUERY)
    const batchSize = this.options?.batchSize || DEFAULT_BATCH_SIZE
    const FETCH_PAGE_SIZE = 100
    const publishedFilter = { status: 'published', deleted_at: null }
    // const service = this.yesplzService

    const startedAt = Date.now()
    let idsToSync: string[]

    logger.info(`${ERROR_PREFIX} [syncPrices] === STARTING === productIds=${productIds?.length ?? 'all'} batchSize=${batchSize}`)

    if (productIds?.length) {
      idsToSync = productIds
      logger.info(`${ERROR_PREFIX} [syncPrices] Using ${productIds.length} provided product IDs`)
    } else {
      const allIds: string[] = []
      let skip = 0
      logger.info(`${ERROR_PREFIX} [syncPrices] Fetching all published product IDs...`)
      while (true) {
        const { data: products } = await query.graph({
          entity: 'product',
          fields: ['id'],
          filters: publishedFilter as RemoteQueryFilters<"product">,
          pagination: { skip, take: FETCH_PAGE_SIZE }
        })
        allIds.push(...products.map((p: { id: string }) => p.id))
        if (products.length < FETCH_PAGE_SIZE) break
        skip += products.length
      }
      idsToSync = allIds
      logger.info(`${ERROR_PREFIX} [syncPrices] Found ${allIds.length} published products in ${Date.now() - startedAt}ms`)
    }

    if (idsToSync.length === 0) {
      logger.info(`${ERROR_PREFIX} [syncPrices] === SKIP === no product IDs to sync`)
      return { updatedCount: 0, failedCount: 0, failedItems: [] }
    }

    const allProducts: any[] = []
    const fetchStartMs = Date.now()
    for (let i = 0; i < idsToSync.length; i += FETCH_PAGE_SIZE) {
      const chunk = idsToSync.slice(i, i + FETCH_PAGE_SIZE)
      const fetchChunkNum = Math.floor(i / FETCH_PAGE_SIZE) + 1
      const totalFetchChunks = Math.ceil(idsToSync.length / FETCH_PAGE_SIZE)
      const products = await fetchProductsFn(chunk)
      allProducts.push(...(products || []))
      if (logger.debug) {
        logger.debug(`${ERROR_PREFIX} [syncPrices] fetch chunk ${fetchChunkNum}/${totalFetchChunks}: requested=${chunk.length} received=${products?.length ?? 0} totalFetched=${allProducts.length}`)
      }
    }
    logger.info(`${ERROR_PREFIX} [syncPrices] Product fetch complete: ${allProducts.length} products in ${Date.now() - fetchStartMs}ms`)

    if (allProducts.length === 0) {
      logger.info(
        `${ERROR_PREFIX} [syncPrices] === SKIP === fetch returned 0 products (requested_ids=${idsToSync.length})`
      )
      return { updatedCount: 0, failedCount: 0, failedItems: [] }
    }

    const scope = productIds?.length ? `requested_ids=${productIds.length}` : 'all_published'
    const totalBatches = Math.ceil(allProducts.length / batchSize)
    logger.info(
      `${ERROR_PREFIX} [syncPrices] === SYNCING === scope=${scope} total=${allProducts.length} batches=${totalBatches} batchSize=${batchSize}`
    )

    let updatedCount = 0
    const failedItems: Array<{ product_id: string; error: string }> = []
    const syncLoopStartMs = Date.now()

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const batchStartMs = Date.now()
      const pending = allProducts.length - i - batch.length

      logger.info(
        `${ERROR_PREFIX} [syncPrices] batch ${batchNumber}/${totalBatches}: processing ${batch.length} products | completed=${updatedCount} failed=${failedItems.length} pending=${pending}`
      )

      const results = await Promise.allSettled(
        batch.map(async (product) => {
          const { price, mrp, sellerId } = this.getPriceAndMrpFromMinPriceVariant(product)
          const nameFromProduct =
            typeof product?.subtitle === 'string' && product.subtitle.trim()
              ? product.subtitle.trim()
              : typeof product?.handle === 'string' && product.handle.trim()
                ? product.handle.trim()
                : 'Product'
          await this.updateProductPrice(product.id, mrp, price, sellerId, nameFromProduct)
          return product.id
        })
      )

      results.forEach((result, idx) => {
        const productId = batch[idx]?.id ?? 'unknown'
        if (result.status === 'fulfilled') {
          updatedCount++
        } else {
          const reason = result.status === 'rejected' ? result.reason : null
          const errorMessage = reason?.message ?? String(reason ?? 'Unknown error')
          logger.warn(`${ERROR_PREFIX} [syncPrices] Failed for product ${productId}: ${errorMessage}`)
          failedItems.push({ product_id: productId, error: errorMessage })
        }
      })

      const batchElapsedMs = Date.now() - batchStartMs
      const totalElapsedMs = Date.now() - syncLoopStartMs
      const avgBatchMs = totalElapsedMs / batchNumber
      const etaMs = Math.round(avgBatchMs * (totalBatches - batchNumber))
      const etaFormatted = etaMs < 60000 ? `${Math.round(etaMs / 1000)}s` : `${Math.round(etaMs / 60000)}m`

      if (logger.debug) {
        logger.debug(
          `${ERROR_PREFIX} [syncPrices] batch ${batchNumber}/${totalBatches} done in ${batchElapsedMs}ms | ` +
          `totalElapsed=${totalElapsedMs}ms avgBatch=${Math.round(avgBatchMs)}ms ETA=${etaFormatted} | ` +
          `completed=${updatedCount} failed=${failedItems.length} pending=${pending}`
        )
      }
    }

    const totalDurationMs = Date.now() - startedAt
    const durationFormatted = totalDurationMs < 60000
      ? `${Math.round(totalDurationMs / 1000)}s`
      : totalDurationMs < 3600000
        ? `${Math.round(totalDurationMs / 60000)}m ${Math.round((totalDurationMs % 60000) / 1000)}s`
        : `${Math.floor(totalDurationMs / 3600000)}h ${Math.round((totalDurationMs % 3600000) / 60000)}m`
    logger.info(
      `${ERROR_PREFIX} [syncPrices] === COMPLETE === updated=${updatedCount} failed=${failedItems.length} total=${allProducts.length} duration=${durationFormatted} (${totalDurationMs}ms)`
    )

    return { updatedCount, failedCount: failedItems.length, failedItems }
  }

  /**
   * Get price and MRP for a product using the same logic as storefront / data-for-sorting:
   * - Resolve the min-price variant (variant with lowest price via min_price_seller_id → seller_prices[sellerId].calculated_amount)
   * - From that variant, use min_price_seller_id and seller_prices[sellerId]
   * - price = sellerPrice.calculated_amount, mrp = sellerPrice.original_amount (fallback to calculated_amount)
   * - Also returns price_id for discount lookup
   */
  private getPriceAndMrpFromMinPriceVariant(product: any): { price: number; mrp: number; sellerId: string; price_id?: string } {
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
    const sellerPrice = sellerId && cp?.seller_prices?.[sellerId]
      ? cp.seller_prices[sellerId]
      : null

    if (!sellerPrice) {
      const fallback = cp?.calculated_amount
      return { price: typeof fallback === 'number' ? fallback : 0, mrp: typeof fallback === 'number' ? fallback : 0, sellerId: '' }
    }

    const price = sellerPrice.calculated_amount ?? 0
    const mrp = sellerPrice.original_amount ?? price
    const price_id = sellerPrice.calculated_price?.id
    return { price, mrp, price_id, sellerId }
  }

  /**
   * Shared inventory resolver for YesPlz.
   * Given a list of products (with variants), computes:
   * - variantToDsLocations: variant.id -> array of dark-store location_ids
   * - variantHasStock: variant.id -> boolean (effectiveQty > 0 in any location)
   *
   * This is used by both:
   * - syncInventory (updateProductInventory)
   * - SearchService.fetchProducts (via YesPlz provider) to populate variant.available_locations
   */
  private async resolveVariantInventory(
    query: any,
    products: any[]
  ): Promise<{
    variantToDsLocations: Map<string, string[]>
    variantHasStock: Map<string, boolean>
  }> {
    const INVENTORY_QUERY_CHUNK_SIZE = 20

    const variantIds = [...new Set(products.flatMap(p => (p.variants || []).map((v: any) => v.id)))]
    const variantToLocationsMap = new Map<string, string[]>()
    const variantToAvailableMap = new Map<string, boolean>()

    if (variantIds.length > 0) {
      const queryInChunks = async <R>(
        ids: string[],
        entity: string,
        fields: string[],
        idField: string
      ): Promise<R[]> => {
        const results = await Promise.all(
          Array.from({ length: Math.ceil(ids.length / INVENTORY_QUERY_CHUNK_SIZE) }, (_, i) =>
            query.graph({
              entity,
              fields,
              filters: { [idField]: ids.slice(i * INVENTORY_QUERY_CHUNK_SIZE, (i + 1) * INVENTORY_QUERY_CHUNK_SIZE) }
            })
          )
        )
        return results.flatMap(r => r.data) as R[]
      }

      const variantInventoryItems = await queryInChunks<{ variant_id: string; inventory_item_id: string }>(
        variantIds,
        'product_variant_inventory_item',
        ['variant_id', 'inventory_item_id'],
        'variant_id'
      )

      if (variantInventoryItems.length > 0) {
        const variantToInventoryMap = variantInventoryItems.reduce((acc, item) => {
          const list = acc.get(item.variant_id) ?? []
          list.push(item.inventory_item_id)
          acc.set(item.variant_id, list)
          return acc
        }, new Map<string, string[]>())

        const inventoryItemIds = [...new Set(variantInventoryItems.map(i => i.inventory_item_id))]
        const allLevels = await queryInChunks<{
          inventory_item_id: string
          location_id: string
          stocked_quantity?: number
          reserved_quantity?: number
        }>(
          inventoryItemIds,
          'inventory_level',
          ['inventory_item_id', 'location_id', 'stocked_quantity', 'reserved_quantity'],
          'inventory_item_id'
        )

        const {
          locationMap: inventoryItemToLocationsMap,
          stockMap: inventoryItemHasStockMap
        } = allLevels.reduce(
          (acc, level) => {
            const availableQty = (level.stocked_quantity ?? 0) - (level.reserved_quantity ?? 0)
            if (availableQty > 0 && level.location_id) {
              const locs = acc.locationMap.get(level.inventory_item_id) ?? []
              locs.push(level.location_id)
              acc.locationMap.set(level.inventory_item_id, locs)
              acc.stockMap.set(level.inventory_item_id, true)
            }
            return acc
          },
          { locationMap: new Map<string, string[]>(), stockMap: new Map<string, boolean>() }
        )

        for (const [variantId, invItemIds] of variantToInventoryMap) {
          const locations = [...new Set(invItemIds.flatMap(id => inventoryItemToLocationsMap.get(id) ?? []))]
          const hasStock = invItemIds.some(id => inventoryItemHasStockMap.get(id))
          variantToLocationsMap.set(variantId, locations)
          variantToAvailableMap.set(variantId, hasStock)
        }
      }
    }

    // Resolve to dark-store locations only (DS), using location_hierarchy + stock_location_extension.
    const allLocationIdsFromInventory = [...new Set([...variantToLocationsMap.values()].flat())]
    const childToParentMap = new Map<string, string>()
    const dsSet = new Set<string>()
    const HIERARCHY_CHUNK_SIZE = 50

    if (allLocationIdsFromInventory.length > 0) {
      for (let c = 0; c < allLocationIdsFromInventory.length; c += HIERARCHY_CHUNK_SIZE) {
        const chunk = allLocationIdsFromInventory.slice(c, c + HIERARCHY_CHUNK_SIZE)
        const normalizedChunkKey = chunk.slice().sort().join(',')
        const hierarchyCacheKey = `location_hierarchy:child_ids:${normalizedChunkKey}`

        const { data: hierarchyRows } = await query.graph(
          {
            entity: 'location_hierarchy',
            fields: ['parent_location_id', 'child_location_id'],
            filters: { child_location_id: { $in: chunk } }
          },
          {
            cache: {
              enable: true,
              key: hierarchyCacheKey,
              ttl: 3600
            }
          }
        )
        ;(hierarchyRows || []).forEach((row: { parent_location_id: string; child_location_id: string }) => {
          childToParentMap.set(row.child_location_id, row.parent_location_id)
        })
      }

      // Build dsSet from PARENT locations (dark store is the parent in hierarchy, not the child/omni).
      const parentLocationIds = [...new Set(childToParentMap.values())].filter(Boolean)
      for (let c = 0; c < parentLocationIds.length; c += HIERARCHY_CHUNK_SIZE) {
        const parentChunk = parentLocationIds.slice(c, c + HIERARCHY_CHUNK_SIZE)
        const normalizedIds = parentChunk.slice().sort().join(',')
        const stockLocationCacheKey = `stock_location:parent_ids:${normalizedIds}`

        const { data: locations } = await query.graph(
          {
            entity: 'stock_location',
            fields: ['id', 'stock_location_extension.location_type'],
            filters: { id: { $in: parentChunk } }
          },
          {
            cache: {
              enable: true,
              key: stockLocationCacheKey,
              ttl: 600
            }
          }
        )
        ;(locations || []).forEach((loc: any) => {
          if (loc?.stock_location_extension?.location_type === LocationType.DARK_STORE.toString()) {
            dsSet.add(loc.id)
          }
        })
      }

      // Also add INVENTORY locations that are DARK_STORE (stock at DS directly, not at Omni).
      // Parent loop above only adds parents of Omnis; when stock is at a DS, that DS id is in
      // allLocationIdsFromInventory and must be in dsSet to be kept.
      for (let c = 0; c < allLocationIdsFromInventory.length; c += HIERARCHY_CHUNK_SIZE) {
        const childChunk = allLocationIdsFromInventory.slice(c, c + HIERARCHY_CHUNK_SIZE)
        const normalizedChildIds = childChunk.slice().sort().join(',')
        const stockLocationCacheKeyChild = `stock_location:inventory_ids:${normalizedChildIds}`

        const { data: childLocations } = await query.graph(
          {
            entity: 'stock_location',
            fields: ['id', 'stock_location_extension.location_type'],
            filters: { id: { $in: childChunk } }
          },
          {
            cache: {
              enable: true,
              key: stockLocationCacheKeyChild,
              ttl: 600
            }
          }
        )
        ;(childLocations || []).forEach((loc: any) => {
          if (loc?.stock_location_extension?.location_type === LocationType.DARK_STORE.toString()) {
            dsSet.add(loc.id)
          }
        })
      }
    }

    const variantToDsLocations = new Map<string, string[]>()
    const variantHasStock = new Map<string, boolean>()

    for (const [variantId, locations] of variantToLocationsMap) {
      const dsLocations = [...new Set(
        locations
          .map((loc: string) => childToParentMap.get(loc) ?? loc)
          .filter((loc: string) => dsSet.has(loc))
      )]
      variantToDsLocations.set(variantId, dsLocations)
      variantHasStock.set(variantId, variantToAvailableMap.get(variantId) ?? false)
    }

    return { variantToDsLocations, variantHasStock }
  }

  /**
   * Resolve Medusa logger from container (falls back to console if unavailable)
   * Includes debug() when available (e.g. LOG_LEVEL=debug in prod).
   */
  private resolveLogger(): {
    info(msg: string): void
    warn(msg: string): void
    error(msg: string): void
    debug?(msg: string): void
  } {
    try {
      const log = this.container.resolve(ContainerRegistrationKeys.LOGGER) as any
      return {
        info: (msg) => log.info(msg),
        warn: (msg) => log.warn(msg),
        error: (msg) => log.error(msg),
        debug: typeof log.debug === 'function' ? (msg: string) => log.debug(msg) : undefined
      }
    } catch {
      return {
        info: (msg) => console.log(msg),
        warn: (msg) => console.warn(msg),
        error: (msg) => console.error(msg),
        debug: (msg) => console.debug(msg)
      }
    }
  }

  /**
   * Process products in batches
   */
  private async processBatches<T>(
    items: T[],
    batchSize: number,
    processor: (batch: T[], batchNumber: number, totalBatches: number) => Promise<void>,
    logPrefix: string
  ): Promise<void> {
    const totalBatches = Math.ceil(items.length / batchSize)

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1

      this.resolveLogger().info(`${ERROR_PREFIX} ${logPrefix} batch ${batchNumber}/${totalBatches} (${batch.length} items)...`)
      await processor(batch, batchNumber, totalBatches)
    }
  }

  /**
   * Publish products to YesPlz
   * Matches proposed architecture: receives already-fetched products
   * Optimized: Try update first, fallback to create on failure
   * Processes products in batches for better performance
   * 
   * Calculates promotions and adds couponData before transforming products
   * Also enriches with discount percentages from database
   * 
   * @param products - Array of formatted products from Medusa (already fetched)
   */
  async publishProduct(products: any[]): Promise<void> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('publish products'))
    }

    if (!products?.length) {
      return
    }

    // Enrich products with discount percentages from database
    const productsWithDiscounts = await this.enrichProductsWithDiscountPercentages(products)

    // OLD BEHAVIOR (kept for reference, now disabled):
    // - This used to enrich products with couponData and send it to YesPlz.
    // - We no longer want couponData in YesPlz payloads, so this block stays commented.
    //
    // const productsWithCouponData = await this.enrichProductsWithCouponData(productsWithDiscounts)
    // const yesplzProducts = await this.transformProducts(productsWithCouponData)

    // New behavior: transform without couponData
    const yesplzProducts = await this.transformProducts(productsWithDiscounts)

    if (yesplzProducts.length === 0) {
      return
    }

    // Process products in batches
    const batchSize = this.options?.batchSize || DEFAULT_BATCH_SIZE
    const service = this.yesplzService

    await this.processBatches(
      yesplzProducts,
      batchSize,
      async (batch) => {
        // Process all products - errors (including 404s) will be thrown
        await Promise.all(batch.map(product => this.processProductUpdate(service, product)))
      },
      'Processing'
    )
  }

  /**
   * Publish products to YesPlz and collect errors instead of throwing.
   * Failed products are skipped; sync continues. Use for bulk sync scripts.
   *
   * @param products - Array of formatted products from Medusa (already fetched)
   * @returns successCount and errors (productId + error message)
   */
  async publishProductAndCollectErrors(products: any[]): Promise<{
    successCount: number
    errors: PublishProductError[]
  }> {
    const errors: PublishProductError[] = []
    let successCount = 0

    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('publish products'))
    }

    if (!products?.length) {
      return { successCount: 0, errors: [] }
    }

    // Enrich products with discount percentages from database
    const productsWithDiscounts = await this.enrichProductsWithDiscountPercentages(products)

    // OLD BEHAVIOR (kept for reference, now disabled):
    // const productsWithCouponData = await this.enrichProductsWithCouponData(productsWithDiscounts)
    // const yesplzProducts = await this.transformProducts(productsWithCouponData)

    // New behavior: transform without couponData
    const yesplzProducts = await this.transformProducts(productsWithDiscounts)

    if (yesplzProducts.length === 0) {
      return { successCount: 0, errors: [] }
    }

    const batchSize = this.options?.batchSize || DEFAULT_BATCH_SIZE
    const service = this.yesplzService
    const totalBatches = Math.ceil(yesplzProducts.length / batchSize)

    for (let i = 0; i < yesplzProducts.length; i += batchSize) {
      const batch = yesplzProducts.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      this.resolveLogger().info(`${ERROR_PREFIX} Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)...`)

      const results = await Promise.allSettled(
        batch.map((product) => this.processProductUpdate(service, product))
      )

      results.forEach((result, index) => {
        const productId = batch[index]?.productId || batch[index]?.id || 'unknown'
        if (result.status === 'fulfilled') {
          successCount += 1
        } else {
          const errorMessage = result.reason?.message ?? String(result.reason)
          const payload = batch[index]
          const inventoryInfo = Array.isArray(payload?.inventoryInfo) ? payload.inventoryInfo : []
          const sizeLabels = inventoryInfo
            .map((inv: any) => inv?.brandSizeLabel)
            .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)

          const duplicateSizeLabels: string[] = Array.from(
            new Set(sizeLabels.filter((v: string, i: number) => sizeLabels.indexOf(v) !== i))
          )

          const skuIds = inventoryInfo
            .map((inv: any) => inv?.skuId)
            .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)

          errors.push({
            productId,
            error: errorMessage,
            timestamp: new Date().toISOString(),
            payload,
            sizes: payload?.sizes,
            inventoryInfoCount: inventoryInfo.length,
            duplicateSizeLabels,
            skuIds,
          })
          this.resolveLogger().warn(`${ERROR_PREFIX} Skipped product ${productId}: ${errorMessage}`)
        }
      })
    }

    return { successCount, errors }
  }

  /**
   * Unpublish products from YesPlz
   * Matches proposed architecture: receives product IDs
   * Processes products in batches for better performance
   * 
   * @param productIds - Array of product IDs to remove
   */
  async unpublishProduct(productIds: string[]): Promise<void> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('unpublish products'))
    }

    if (!productIds?.length) {
      return
    }

    const batchSize = this.options?.batchSize || DEFAULT_BATCH_SIZE
    const service = this.yesplzService

    await this.processBatches(
      productIds,
      batchSize,
      async (batch, batchNumber, totalBatches) => {
        // Process all deletions - errors (including 404s) will be thrown
        await Promise.all(
          batch.map(async (productId) => {
            const result = await service.sendProductDeleted(productId)
            if (!result.success) {
              throw new Error(`Failed to delete product ${productId}: ${result.error}`)
            }
          })
        )
        this.resolveLogger().info(`${ERROR_PREFIX} Completed removal batch ${batchNumber}/${totalBatches}`)
      },
      'Removing'
    )
  }

  /**
   * Convert SearchQuery sort option to YesPlz API value (SortOption is already canonical).
   */
  private mapSortOption(sort: SortOption): 'recommended' | 'popularity' | 'newest' | 'discount' | 'price_asc' | 'price_desc' {
    return sort
  }

  /**
   * Convert SearchQuery to ListProductsParams format
   */
  private convertSearchQueryToParams(searchQuery?: SearchQuery): ListProductsParams | undefined {
    if (!searchQuery) {
      return undefined
    }

    const params: ListProductsParams = {
      q: searchQuery.q,
      offset: searchQuery.pagination.offset,
      limit: searchQuery.pagination.limit,
      sort: this.mapSortOption(searchQuery.sort),
      location: searchQuery.location,
    }

    // Add generic filters (includes price, discount, rating as raw strings for YesPlz)
    if (searchQuery.filters) {
      Object.assign(params, searchQuery.filters)
    }

    return params
  }

  /**
   * Redistribute gender filter counts to match Algolia logic:
   * - Unisex: hidden from UI, count added to both Men and Women
   * - Kids: hidden from UI, count added to both Girls and Boys
   */
  private redistributeGenderFilters(filters: any): any {
    if (!filters) return filters

    const processPrimaryFilter = (filterGroup: any) => {
      if (!filterGroup || (filterGroup.key || '').toLowerCase() !== 'gender') {
        return filterGroup
      }

      const filterValues: any[] = Array.isArray(filterGroup.filterValues) ? filterGroup.filterValues : []
      const hiddenCountByKey: Record<string, number> = {}
      for (const hiddenKey of HIDDEN_GENDER_VALUES) {
        hiddenCountByKey[hiddenKey] =
          filterValues.find((fv: any) => (fv.value || '').toLowerCase() === hiddenKey)?.count ?? 0
      }

      const filteredAndRedistributed = filterValues
        .filter((fv: any) => !HIDDEN_GENDER_VALUES.includes((fv.value || '').toLowerCase()))
        .map((fv: any) => {
          const v = (fv.value || '').toLowerCase()
          let count = typeof fv.count === 'number' ? fv.count : 0
          for (const [hiddenKey, visibleValues] of Object.entries(GENDER_REDISTRIBUTION_MAP)) {
            if (visibleValues.includes(v)) {
              count += hiddenCountByKey[hiddenKey] ?? 0
            }
          }
          return { ...fv, count }
        })

      return { ...filterGroup, filterValues: filteredAndRedistributed }
    }

    const processSavedFilter = (filterGroup: any) => {
      if (!filterGroup || (filterGroup.key || '').toLowerCase() !== 'gender') {
        return filterGroup
      }
      const filterValues = Array.isArray(filterGroup.filterValues) ? filterGroup.filterValues : []
      return {
        ...filterGroup,
        filterValues: filterValues.filter(
          (fv: any) => !HIDDEN_GENDER_VALUES.includes((fv.value || '').toLowerCase())
        )
      }
    }

    return {
      ...filters,
      primaryFilters: (filters.primaryFilters || []).map(processPrimaryFilter),
      savedFilters: (filters.savedFilters || []).map(processSavedFilter)
    }
  }

  /**
   * List products from YesPlz API
   * Returns the raw YesPlz response shape (products, filters, sortOptions with displayName)
   * so the store API responds in YesPlz format only, not Algolia/SearchResult format.
   *
   * @param params - Optional SearchQuery parameters for filtering products
   * @returns ProductListResponse (YesPlz format) - cast to SearchResult for interface compatibility
   */
  async listProducts(params?: SearchQuery): Promise<SearchResult<SearchProduct>> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('list products'))
    }

    const yesplzParams = this.convertSearchQueryToParams(params)
    const response = await this.yesplzService.listProducts(yesplzParams)

    // Redistribute gender filter counts: Unisex → Men+Women, Kids → Girls+Boys; hide Unisex/Kids from UI
    if (response?.filters) {
      response.filters = this.redistributeGenderFilters(response.filters)
    }

    // Normalize sortOptions to canonical list (value + displayName); mark selected from current sort
    const currentSort = yesplzParams?.sort ?? 'recommended'
    response.sortOptions = CANONICAL_SORT_OPTIONS.map(opt => ({
      value: opt.value,
      displayName: opt.displayName,
      selected: opt.value === currentSort,
    }))

    // Return raw YesPlz response (products, filters.savedFilters/primaryFilters, sortOptions.displayName)
    // Cast to satisfy SearchProviderStrategy interface; API responds in YesPlz format only
    return response as unknown as SearchResult<SearchProduct>
  }

  /**
   * List collections from YesPlz API
   * This method is called by SearchService for frontend endpoints
   * 
   * @param params - Optional parameters for filtering/listing collections
   * @returns Collection list response
   */
  async listCollections(params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('list collections'))
    }

    // Call YesPlz service directly - cast params and result to match interface
    const result = await this.yesplzService.listCollections(params as ListCollectionsParams)
    return result as unknown as Record<string, unknown>
  }

  async getKeywordSuggestions(params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('get keyword suggestions'))
    }

    // Call YesPlz service directly - cast params and result to match interface
    const result = await this.yesplzService.getKeywordSuggestions(params as KeywordSuggestionParams)
    return result as unknown as Record<string, unknown>
  }

  async getPopularSearches(params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.yesplzService) {
      throw new Error(ERRORS.SERVICE_NOT_INITIALIZED('get popular searches'))
    }

    // Call YesPlz service directly - cast params and result to match interface
    const result = await this.yesplzService.getPopularSearches(params as Omit<KeywordSuggestionParams, 'query'>)
    return result as unknown as Record<string, unknown>
  }

  getServiceName(): string {
    return 'YesPlz'
  }

  isEnabled(): boolean {
    return this.yesplzService !== null
  }
}

