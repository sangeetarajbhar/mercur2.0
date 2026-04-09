/**
 * Generic Product Events
 * Used by all product synchronization services (Algolia, YesPlz, etc.)
 * This allows services to be enabled/disabled independently via config
 */
export enum ProductEvents {
  PRODUCTS_CHANGED = 'product.sync.changed',
  PRODUCTS_DELETED = 'product.sync.deleted'
}

