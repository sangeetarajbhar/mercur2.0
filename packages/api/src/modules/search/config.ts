/**
 * Search Module Configuration
 * Centralized configuration for search-related settings
 */

/**
 * Search pagination configuration
 */
export const SEARCH_CONFIG = {
  /**
   * Default number of products per page
   */
  DEFAULT_LIMIT: 48,

  /**
   * Maximum number of products per page
   * Prevents excessive data transfer and performance issues
   */
  MAX_LIMIT: 250,

  /**
   * Default pagination offset
   */
  DEFAULT_OFFSET: 0
} as const

