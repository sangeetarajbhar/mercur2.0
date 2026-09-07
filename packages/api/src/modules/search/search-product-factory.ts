import { MedusaContainer } from '@medusajs/framework'
import { SearchProviderStrategy } from './types'
import { YesPlzSearchProvider } from './strategies/yesplz-strategies/yesplz-provider'
import type { YesPlzServiceOptions } from './strategies/yesplz-strategies/yesplz-service'
// Future: import { AlgoliaSearchProvider } from './strategies/algolia-provider'

/**
 * Search Product Factory
 * Central factory for creating all search provider strategies
 * Manages initialization of YesPlz, Algolia, and future providers
 */

/**
 * Create YesPlz search provider if enabled
 * All YesPlz-specific initialization logic is contained here
 * This keeps YesPlz code isolated from the generic search service
 */
export function createYesPlzStrategy(container: MedusaContainer): SearchProviderStrategy | null {
  // Read YesPlz environment variables
  const yesplzOptions: YesPlzServiceOptions = {
    apiUrl: process.env.YESPLZ_API_URL || '',
    webhookSecret: process.env.YESPLZ_WEBHOOK_SECRET || '',
    retailerAdminKey: process.env.YESPLZ_RETAILER_ADMIN_KEY,
    rateLimit: parseInt(process.env.YESPLZ_RATE_LIMIT || '100', 10),
    retryAttempts: parseInt(process.env.YESPLZ_RETRY_ATTEMPTS || '3', 10),
    timeout: parseInt(process.env.YESPLZ_TIMEOUT || '30000', 10)
  }

  // Check if YesPlz is configured (apiUrl and webhookSecret are required)
  if (!yesplzOptions.apiUrl || !yesplzOptions.webhookSecret) {
    return null
  }

  try {
    const yesplzProvider = new YesPlzSearchProvider(container, yesplzOptions)
    return yesplzProvider
  } catch (error: any) {
    console.error('[Search] Failed to initialize YesPlz provider:', error.message)
    return null
  }
}

/**
 * Create all enabled search strategies
 * This is the main entry point for initializing all search providers
 * 
 * @param container - Medusa container
 * @returns Array of initialized search strategies
 */
export function createAllSearchStrategies(container: MedusaContainer): SearchProviderStrategy[] {
  const strategies: SearchProviderStrategy[] = []

  // Create YesPlz strategy
  const yesplzStrategy = createYesPlzStrategy(container)
  if (yesplzStrategy) {
    strategies.push(yesplzStrategy)
  }

  // Future providers can be added here

  return strategies
}

