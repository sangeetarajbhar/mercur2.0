export enum RedisKey {
  OMNI_PROMISE_VALUE = 'omni_promise_value',
  STOCK_LOCATION_CACHE = 'stock_location_cache',
  /** JSON `stock_location_id[]` for a seller + partner (see shared/utils/cache/seller-partner-stock-location-ids-cache). */
  SELLER_PARTNER_STOCK_LOCATION_IDS = 'seller_partner_stock_location_ids',
  PROMOTION_RULES_CACHE = 'promotion_rules_cache',
}

export enum QueryGraphCacheKey {
  'CHECK_CART_IS_COMPLETED' = 'check_cart_is_completed_',
  'FETCH_ZONE_BY_PINCODE' = 'fetch_zone_by_pincode_',
  'FETCH_CONTROL_BY_ZONE_ID' = 'fetch_control_by_zone_id_',
  'FETCH_CONTROL_BY_DARK_STORE_ID' = 'fetch_control_by_dark_store_id_',
  'GET_LOCATION_EXTENSION_TIME' = 'get_location_extension_time_',
  'GET_LOCATION_HIERARCHIES' = 'get_location_hierarchies_',
  /** DS (parent) + omni (child) row — promise_minutes for omni delivery uplift */
  'GET_LOCATION_HIERARCHY_OMNI_PROMISE' = 'get_location_hierarchy_omni_promise_',
  'FETCH_VARIANT_INVENTORY_ITEMS' = 'fetch_variant_inventory_items_',
  'FETCH_INSTANT_PROMISES' = 'fetch_instant_promises_',
  'FETCH_SLOT_OVERRIDES' = 'fetch_slot_overrides_',
}

export enum UseQueryGraphStepCacheKey {
  'CHECK_CART_POSTAL_CODE' = 'check_cart_postal_code_',
  'GET_CUSTOMER_NAME' = 'get_customer_name_',
  'GET_LOCATION_EXTENSION' = 'get_location_extension_',
  'GET_LOCATION_HIERARCHIES' = 'get_location_hierarchies_',
  'GET_REGION' = 'get_region_',
}

// in seconds & must be in number, which is default of medusa cache ttl
const DEFAULT_TTL = Number(process.env.CACHE_TTL_DEFAULT ?? 300)
export const CACHE_ENABLE = process.env.CACHE_ENABLE ? JSON.parse(process.env.CACHE_ENABLE) : false

const SHORT_LIVE_TTL = Number(process.env.CACHE_TTL_SHORT_LIVE)
const LONG_LIVE_TTL = Number(process.env.CACHE_TTL_LONG_LIVE)

const resolveTTL = (ttl: number): number => {
  return Number.isFinite(ttl) ? ttl : DEFAULT_TTL
}

const SHORT_LIVE_CACHE_TTL = resolveTTL(SHORT_LIVE_TTL)
const LONG_LIVE_CACHE_TTL = resolveTTL(LONG_LIVE_TTL)

type CartCacheKey = QueryGraphCacheKey | UseQueryGraphStepCacheKey

const shortLiveCacheKeys: CartCacheKey[] = [
  QueryGraphCacheKey.CHECK_CART_IS_COMPLETED,
  QueryGraphCacheKey.FETCH_VARIANT_INVENTORY_ITEMS,
  QueryGraphCacheKey.FETCH_SLOT_OVERRIDES,
  UseQueryGraphStepCacheKey.CHECK_CART_POSTAL_CODE,
  UseQueryGraphStepCacheKey.GET_CUSTOMER_NAME,
]

const longLiveCacheKeys: CartCacheKey[] = [
  QueryGraphCacheKey.FETCH_ZONE_BY_PINCODE,
  QueryGraphCacheKey.FETCH_CONTROL_BY_ZONE_ID,
  QueryGraphCacheKey.FETCH_CONTROL_BY_DARK_STORE_ID,
  QueryGraphCacheKey.GET_LOCATION_EXTENSION_TIME,
  QueryGraphCacheKey.GET_LOCATION_HIERARCHIES,
  QueryGraphCacheKey.GET_LOCATION_HIERARCHY_OMNI_PROMISE,
  QueryGraphCacheKey.FETCH_INSTANT_PROMISES,
  UseQueryGraphStepCacheKey.GET_LOCATION_EXTENSION,
  UseQueryGraphStepCacheKey.GET_LOCATION_HIERARCHIES,
  UseQueryGraphStepCacheKey.GET_REGION,
]

const createCacheTTLMap = (): Record<CartCacheKey, number> => {
  const map = {} as Record<CartCacheKey, number>

  shortLiveCacheKeys.forEach((key) => {
    map[key] = SHORT_LIVE_CACHE_TTL
  })

  longLiveCacheKeys.forEach((key) => {
    map[key] = LONG_LIVE_CACHE_TTL
  })

  return map
}

export const CacheTTLMap = createCacheTTLMap()
