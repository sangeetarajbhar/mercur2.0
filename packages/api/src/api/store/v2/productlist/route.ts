import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { SEARCH_MODULE } from '../../../../modules/search'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import SearchModuleService from '../../../../modules/search/service'
import { SortOption, GenericFilters } from '../../../../modules/search/types'
import { SEARCH_CONFIG } from '../../../../modules/search/config'
import { calculateProductListPromises } from '../../product-list/utils/calculate-product-list-promises'
import { buildPlpPromiseMessage, resolveZoneForPromise } from './utils/delivery-promise'
import { getWishlistProductIds } from './utils/wishlist'
import { transformProductImagesForPLP } from './resolve-image-url'
import { enrichProductsWithCouponData } from '../../../../shared/utils/enrich-products-with-coupon-data'
import type { CalculateProductListPromisesInput } from '../../product-list/utils/calculate-product-list-promises'
import CustomCacheModuleService from '../../../../modules/cache/service'
import { createHash } from 'crypto'

const YESPLZ_PRODUCTLIST_CACHE_TTL_SECONDS = process.env.YESPLZ_PRODUCTLIST_CACHE_TTL_SECONDS
  ? Number(process.env.YESPLZ_PRODUCTLIST_CACHE_TTL_SECONDS)
  : 300

const YESPLZ_PRODUCTLIST_CACHE_PREFIX = 'yesplz:productlist:v2:'

type ScopeLike = {
  resolve(key: unknown): unknown
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

function buildYesplzCacheKey(input: {
  q?: string
  offset: number
  limit: number
  sort: SortOption
  location: string | null
  pincode: string | null
  filters: GenericFilters
}): string {
  const largePart = stableStringify({ q: input.q ?? null, filters: input.filters ?? {} })
  const digest = createHash('sha1').update(largePart).digest('hex')

  const loc = input.location ? String(input.location) : 'none'
  const pin = input.pincode ? String(input.pincode) : 'none'

  return `${YESPLZ_PRODUCTLIST_CACHE_PREFIX}${loc}:${pin}:${input.offset}:${input.limit}:${input.sort}:${digest}`
}

function cloneJson<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T
}

async function getYesplzResponseFromCache(
  scope: ScopeLike,
  cacheKey: string
): Promise<unknown | null> {
  try {
    const cacheService = scope.resolve(Modules.CACHE) as CustomCacheModuleService
    const cached = await cacheService.get(cacheKey)
    return cached ? cloneJson(cached) : null
  } catch {
    return null
  }
}

async function setYesplzResponseInCache(
  scope: ScopeLike,
  cacheKey: string,
  payload: unknown
): Promise<void> {
  try {
    const cacheService = scope.resolve(Modules.CACHE) as CustomCacheModuleService
    await cacheService.set(cacheKey, payload, YESPLZ_PRODUCTLIST_CACHE_TTL_SECONDS)
  } catch {
    // ignore cache errors
  }
}

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

const RESERVED_PARAMS = new Set([
  'q', 'offset', 'limit', 'sort', 'sortBy', 'location_id',
  'price', 'discount', 'price_filter', 'price_range', 'rating',
  'pincode', 'resolution','lat','long'
])

function forwardQueryFilters(query: Record<string, unknown>): GenericFilters {
  const filters: GenericFilters = {}

  for (const [key, value] of Object.entries(query)) {
    if (RESERVED_PARAMS.has(key) || value === undefined || value === null) continue
    // Normalize arrays to avoid cache-key misses caused by ordering differences
    filters[key] = Array.isArray(value)
      ? value.map((v) => String(v)).sort()
      : String(value)
  }

  const priceRaw = query.price ?? query.price_filter ?? query.price_range
  if (priceRaw != null && priceRaw !== '') {
    filters.price = String(priceRaw)
  }

  return filters
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const t0 = Date.now()
    const scope = req.scope
    const searchService: SearchModuleService = scope.resolve(SEARCH_MODULE)

    const q = req.query

    const offset = Math.max(
      SEARCH_CONFIG.DEFAULT_OFFSET,
      Number(q.offset) || SEARCH_CONFIG.DEFAULT_OFFSET
    )

    const limit = Math.min(
      SEARCH_CONFIG.MAX_LIMIT,
      Math.max(1, Number(q.limit) || SEARCH_CONFIG.DEFAULT_LIMIT)
    )

    const customerId =
      (req as any).auth_context?.actor_id ?? null

    const pincode = q.pincode ? String(q.pincode).trim() : null

    const location =
      q.location_id != null
        ? String(q.location_id)
        : q.location != null
        ? String(q.location)
        : null

    const resolution =
      typeof q.resolution === "string" ? q.resolution : "3x"

    const sort = parseSort(q as Record<string, unknown>)
    const forwardedFilters = forwardQueryFilters(q as Record<string, unknown>)

    // 🔥 parallel start
    const wishlistPromise = customerId
      ? getWishlistProductIds(req)
      : Promise.resolve(new Set<string>())

    const yesplzCacheKey = buildYesplzCacheKey({
      q: q.q ? String(q.q) : undefined,
      offset,
      limit,
      sort,
      location,
      pincode,
      filters: forwardedFilters,
    })

    const fetchYesplz = () =>
      searchService.listProducts(scope, {
        q: q.q ? String(q.q) : undefined,
        pagination: { offset, limit },
        sort,
        filters: forwardedFilters,
        ...(location && { location }),
      })

    const searchPromise = (async () => {
      if (YESPLZ_PRODUCTLIST_CACHE_TTL_SECONDS === 0) {
        res.setHeader("x-plp-cache", "bypass")
        return await fetchYesplz()
      }

      const cached = await getYesplzResponseFromCache(scope, yesplzCacheKey)
      if (cached) {
        res.setHeader("x-plp-cache", "hit")
        return cached
      }

      res.setHeader("x-plp-cache", "miss")
      const fresh = await fetchYesplz()

      // ✅ FIXED: clone before caching
      setYesplzResponseInCache(scope, yesplzCacheKey, cloneJson(fresh)).catch(() => {})

      return fresh
    })()

    const tSearchDone = Date.now()
    const result = await searchPromise

    const products = Array.isArray((result as any)?.products)
      ? (result as any).products
      : []

    if (!products.length) {
      res.setHeader("server-timing", `search;dur=${tSearchDone - t0}`)
      return res.json(result)
    }

    const zonePromise = resolveZoneForPromise({
      scope,
      pincode,
      location,
    })

    const couponPromise = enrichProductsWithCouponData(products, scope, {
      customerId: customerId ?? undefined,
      query: scope.resolve(ContainerRegistrationKeys.QUERY),
    })

    const deliveryPromise = zonePromise.then(async (zone) => {
      if (!zone?.zone_id || !zone?.cluster_id) return null

      const list: CalculateProductListPromisesInput["products"] = []

      for (const p of products) {
        const id = typeof (p["id"] ?? p["productId"]) === "string"
          ? (p["id"] ?? p["productId"])
          : null

        if (!id) continue

        const sellerId =
          typeof p["seller"] === "object"
            ? (p["seller"] as any)?.sellerId
            : undefined

        list.push({
          id,
          seller_id: typeof sellerId === "string" ? sellerId : undefined,
        })
      }

      if (!list.length) return null

      return calculateProductListPromises({
        scope,
        products: list,
        zone_id: zone.zone_id,
        cluster_id: zone.cluster_id,
      })
    })

    // sync work
    for (let i = 0; i < products.length; i++) {
      transformProductImagesForPLP(products[i], resolution)
    }

    const [wishlistSet, , promiseMap] = await Promise.all([
      wishlistPromise,
      couponPromise,
      deliveryPromise,
    ])
    const tEnrichDone = Date.now()

    // final mapping
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const id = typeof (p["id"] ?? p["productId"]) === "string"
        ? (p["id"] ?? p["productId"])
        : String(p["id"] ?? "")

      // ✅ always set
      p["is_wishlist"] = wishlistSet.has(id)

      if (promiseMap) {
        const promise = promiseMap.get(id)
        if (promise) {
          p["promise"] = promise

          const msg = buildPlpPromiseMessage(promise)
          if (msg) {
            p["promise_plp_message"] = msg
          }
        }
      }
    }

    res.setHeader(
      "server-timing",
      `search;dur=${tSearchDone - t0}, enrich;dur=${tEnrichDone - tSearchDone}, total;dur=${tEnrichDone - t0}`
    )

    return res.json(result)
  } catch (error: unknown) {
    console.error(
      "[Store Search] Error:",
      error instanceof Error ? error.message : String(error)
    )

    return res.status(500).json({
      error: "Search unavailable",
      code: "SEARCH_ERROR",
    })
  }
}