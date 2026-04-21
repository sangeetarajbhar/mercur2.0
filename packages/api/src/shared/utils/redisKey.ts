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
  'FETCH_PROMOTION_SELLER_LINKS' = 'fetch_promotion_seller_links_',
  'FETCH_CONTROL_BY_ZONE_ID' = 'fetch_control_by_zone_id_',
  'FETCH_CONTROL_BY_DARK_STORE_ID' = 'fetch_control_by_dark_store_id_',
  'GET_LOCATION_EXTENSION_TIME' = 'get_location_extension_time_',
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

const getTTL = (key: string): number => {
  const envKey = `CACHE_TTL_${key.toUpperCase()}`
  const value = process.env[envKey]

  const ttl = value !== undefined ? Number(value) : NaN
  return Number.isFinite(ttl) ? ttl : DEFAULT_TTL
}

export const CacheTTLMap = {
  [QueryGraphCacheKey.CHECK_CART_IS_COMPLETED]: getTTL('CHECK_CART_IS_COMPLETED'),
  [QueryGraphCacheKey.FETCH_ZONE_BY_PINCODE]: getTTL('FETCH_ZONE_BY_PINCODE'),
  [QueryGraphCacheKey.FETCH_PROMOTION_SELLER_LINKS]: getTTL('FETCH_PROMOTION_SELLER_LINKS'),
  [QueryGraphCacheKey.FETCH_CONTROL_BY_ZONE_ID]: getTTL('FETCH_CONTROL_BY_ZONE_ID'),
  [QueryGraphCacheKey.FETCH_CONTROL_BY_DARK_STORE_ID]: getTTL('FETCH_CONTROL_BY_DARK_STORE_ID'),
  [QueryGraphCacheKey.GET_LOCATION_EXTENSION_TIME]: getTTL('GET_LOCATION_EXTENSION_TIME'),

  [UseQueryGraphStepCacheKey.CHECK_CART_POSTAL_CODE]: getTTL('CHECK_CART_POSTAL_CODE'),
  [UseQueryGraphStepCacheKey.GET_CUSTOMER_NAME]: getTTL('GET_CUSTOMER_NAME'),
  [UseQueryGraphStepCacheKey.GET_LOCATION_EXTENSION]: getTTL('GET_LOCATION_EXTENSION'),
  [UseQueryGraphStepCacheKey.GET_LOCATION_HIERARCHIES]: getTTL('GET_LOCATION_HIERARCHIES'),
  [UseQueryGraphStepCacheKey.GET_REGION]: getTTL('GET_REGION'),
}
