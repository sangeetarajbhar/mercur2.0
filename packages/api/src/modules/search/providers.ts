/**
 * Search Providers Export
 * This file exports all search providers and their related types
 * Add new providers here when implementing them
 * 
 * This keeps the main index.ts file clean and future-proof
 */

// YesPlz Provider
export { YesPlzSearchProvider } from './strategies/yesplz-strategies/yesplz-provider'
export type { PublishProductError } from './strategies/yesplz-strategies/yesplz-provider'
export { YesPlzService } from './strategies/yesplz-strategies/yesplz-service'
export type { YesPlzServiceOptions } from './strategies/yesplz-strategies/yesplz-service'

// Future: add provider here when implementing them



