import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { SEARCH_MODULE } from '../../../../modules/search'
import SearchModuleService from '../../../../modules/search/service'
import { SearchQuery, SortOption, GenericFilters } from '../../../../modules/search/types'
import { SEARCH_CONFIG } from '../../../../modules/search/config'
import { calculateProductListPromises } from '../../product-list/utils/calculate-product-list-promises'
import { buildPlpPromiseMessage, resolveZoneForPromise } from './utils/delivery-promise'
import { addWishlistFlagsToProducts } from './utils/wishlist'
import { transformProductImageUrlsWithResolutionForPLP } from '../../products/helpers'
import { transformSingleProductImageUrlsForPLP } from '../../../utils/middlewares/products/transform-image-urls'
import { enrichProductsWithCouponData } from '../../../../shared/utils/enrich-products-with-coupon-data'


/**
 * Parse sort option
 * Maps aliases to canonical values; defaults to 'recommended' (YesPlz canonical first option).
 */
function parseSort(query: Record<string, unknown>): SortOption {
  const sort = String(query.sort || query.sortBy || 'recommended').toLowerCase()

  if (sort === 'price_asc' || sort === 'price_low_to_high') return 'price_asc'
  if (sort === 'price_desc' || sort === 'price_high_to_low') return 'price_desc'
  if (sort === 'popularity') return 'popularity'
  if (sort === 'newest' || sort === 'recent') return 'newest'
  if (sort === 'discount' || sort === 'discount_desc' || sort === 'best_discount') return 'discount'
  if (sort === 'relevance' || sort === 'rating_desc') return 'recommended'

  return 'recommended'
}

/**
 * Forward non-reserved query params to the provider as-is (YesPlz receives them directly).
 * - Reserved params are handled explicitly (q, pagination, sort, location, price aliases).
 * - All other params (e.g. category, brands, color, size, gender, etc.) are passed through.
 * - Arrays are preserved for repeated keys (e.g. category=A&category=B).
 * - Price aliases (price, price_filter, price_range) are normalized into a single filters.price string.
 */
const RESERVED_PARAMS = new Set([
  'q', 'offset', 'limit', 'sort', 'sortBy', 'location_id',
  'price', 'discount', 'price_filter', 'price_range', 'rating',
  'pincode', 'resolution','lat','long'
])

function forwardQueryFilters(query: Record<string, unknown>): GenericFilters {
  const filters: GenericFilters = {}

  for (const [key, value] of Object.entries(query)) {
    if (RESERVED_PARAMS.has(key) || value === undefined || value === null) continue
    filters[key] = Array.isArray(value) ? value.map(v => String(v)) : String(value)
  }

  // Normalize price range aliases into a single 'price' param for YesPlz
  const priceRaw = (query as Record<string, unknown>).price
    ?? (query as Record<string, unknown>).price_filter
    ?? (query as Record<string, unknown>).price_range

  if (priceRaw != null && priceRaw !== '') {
    filters.price = String(priceRaw)
  }

  return filters
}

/**
 * Store Search Products Route
 * Unified endpoint for listing and searching products from the active search provider
 *
 * Query Parameters:
 * - q: string (optional) - Search query
 * - offset: number (optional) - Pagination offset (default: 0)
 * - limit: number (optional) - Results per page (default: 48, max: 250 - configurable in search config)
 * - sort: string (optional) - Sort options (aliases supported: 'price_low_to_high', 'price_high_to_low', 'recent', 'best_discount')
 * - location: string (optional) - Filter by location
 *
 * All other query params are forwarded as-is to YesPlz (e.g. category, brands, color, size, gender, etc.).
 * Repeated keys become arrays (e.g. category=A&category=B).
 *
 * Range param (passed through as-is to YesPlz):
 * - price: string - e.g. "10-100" (price_filter, price_range accepted as aliases)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {

    const searchService: SearchModuleService = req.scope.resolve(SEARCH_MODULE)

    const filters = forwardQueryFilters(req.query as Record<string, unknown>)

    const searchQuery: SearchQuery = {
      q: req.query.q ? String(req.query.q) : undefined,
      pagination: {
        offset: Math.max(SEARCH_CONFIG.DEFAULT_OFFSET, parseInt(String(req.query.offset || SEARCH_CONFIG.DEFAULT_OFFSET), 10) || SEARCH_CONFIG.DEFAULT_OFFSET),
        limit: Math.min(SEARCH_CONFIG.MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit || SEARCH_CONFIG.DEFAULT_LIMIT), 10) || SEARCH_CONFIG.DEFAULT_LIMIT))
      },
      sort: parseSort(req.query as Record<string, unknown>),
      filters,
      // location: req.query.location_id ? String(req.query.location_id) : undefined
      ...(req.query.location_id && { location: String(req.query.location_id) })
    }

    // Call the search service's listProducts method with SearchQuery directly
    const result = await searchService.listProducts(req.scope, searchQuery)

    // Extract product list - support both YesPlz format (result.products) and legacy SearchResult (result.hits)
    const resultAny = result as unknown as { products?: unknown[]; hits?: unknown[] }
    const productList = Array.isArray(resultAny.products)
      ? resultAny.products
      : resultAny.hits

    // Transform product image URLs with resolution (PLP-specific) - per product, same as product-list API
    const resolution = req.query.resolution ? String(req.query.resolution) : undefined

    if (productList && productList.length > 0) {
      if (process.env.DEBUG_PLP_IMAGES || process.env.NODE_ENV === 'development') {
        console.log(`[PLP_IMAGE_DEBUG] Starting transformation - resolution: ${resolution}, products: ${productList.length}`)
      }

      productList.forEach((product: any, productIndex: number) => {
        if (product.images && Array.isArray(product.images)) {
          if (process.env.DEBUG_PLP_IMAGES) {
            console.log(`[PLP_IMAGE_DEBUG] Product ${productIndex} (${product.productId}): ${product.images.length} images`)

            product.images.forEach((image: any, imageIndex: number) => {
              console.log(`[PLP_IMAGE_DEBUG] Before - P${productIndex}I${imageIndex}: ${image.src}`)
            })
          }
        }

        transformProductImageUrlsWithResolutionForPLP(
          product,
          resolution,
          transformSingleProductImageUrlsForPLP
        )

        if (product.images && Array.isArray(product.images)) {
          if (process.env.DEBUG_PLP_IMAGES) {
            product.images.forEach((image: any, imageIndex: number) => {
              console.log(`[PLP_IMAGE_DEBUG] After - P${productIndex}I${imageIndex}: ${image.src}`)
            })
          }
        }
      })
    }

    // Add wishlist flags to products if user is authenticated
    await addWishlistFlagsToProducts(req, productList || [])

    // Enrich products with couponData for PLP (does not affect YesPlz)
    if (productList && productList.length > 0) {
      const authContext = (req as any).auth_context
      const customerId = authContext?.actor_id || undefined
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

      await enrichProductsWithCouponData(productList as any[], req.scope, {
        customerId,
        query,
      })
    }

    // Delivery Promise - resolve zone_id from pincode (preferred) or location (fallback)
    const pincode = req.query.pincode ? String(req.query.pincode).trim() : null
    const locationParam = req.query.location ? String(req.query.location) : null

    const { zone_id, cluster_id } = await resolveZoneForPromise({
      scope: req.scope,
      pincode,
      location: locationParam
    })

    if (zone_id && cluster_id && productList && productList.length > 0) {
      
      // Normalize product shape: YesPlz (productId + inventoryInfo) vs Algolia (id + variants)
      const productsForPromise = productList.map((p: any) => ({
        id: p.id ?? p.productId,
        variants:
          p.variants ??
          (p.inventoryInfo || [])
            .filter((i: any) => i.available && i.location?.length > 0 && i.location?.includes(cluster_id))
            .map((i: any) => ({ id: i.skuId })),
        seller_id: p.seller?.sellerId
      }))

      const promiseMap = await calculateProductListPromises({
        scope: req.scope,
        products: productsForPromise,
        zone_id,
        cluster_id
      })

      // Attach promise to each product (mutating in place so result object is updated)
      for (const product of productList) {
        if (!product || typeof product !== 'object') continue
        const p = product as Record<string, unknown>
        const id = String(p.id ?? p.productId)
        const promise = promiseMap.get(id)
        if (promise) {
          // Attach full promise object
          p.promise = promise
          // Attach formatted PLP message
          const plpMessage = buildPlpPromiseMessage(promise as any)
          if (plpMessage) {
            p.promise_plp_message = plpMessage
          }
        }
      }
    }

    // Return the response from the search provider (products are already mutated with promise data)
    res.json(result)
  } catch (error: unknown) {
    console.error('[Store Search] Error performing search:', error instanceof Error ? error.message : String(error))
    res.status(500).json({
      error: 'Search unavailable',
      code: 'SEARCH_ERROR'
    })
  }
}
