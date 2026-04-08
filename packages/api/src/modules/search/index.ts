import { Module } from '@medusajs/framework/utils'
import SearchModuleService from './service'

export const SEARCH_MODULE = 'searchModuleService'

// Export generic types and service (never changes when adding new providers)
export type { SearchProviderStrategy } from './types'
export { default as SearchModuleService } from './service'

// Export utilities
export { filterProductsByStatus } from './utils'

// Export configuration
export { SEARCH_CONFIG } from './config'

export * from './providers'

export default Module(SEARCH_MODULE, {
  service: SearchModuleService
})

