export enum RedisKey {
  OMNI_PROMISE_VALUE = 'omni_promise_value',
  STOCK_LOCATION_CACHE = 'stock_location_cache',
  /** JSON `stock_location_id[]` for a seller + partner (see shared/utils/cache/seller-partner-stock-location-ids-cache). */
  SELLER_PARTNER_STOCK_LOCATION_IDS = 'seller_partner_stock_location_ids',
  PROMOTION_RULES_CACHE = 'promotion_rules_cache',
}
