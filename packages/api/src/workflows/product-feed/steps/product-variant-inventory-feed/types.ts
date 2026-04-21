/**
 * Types and interfaces for product variant inventory feed generation
 * Following Dependency Inversion Principle - depend on abstractions
 */

export type VariantInventoryFeedItem = {
  /** Medusa variant id — CSV column `id` (aligned with product feed). */
  id?: string
  warehouse_code?: string
  availability: string
}

export type StepInput = {
  filePath: string
  loop?: number
  page_size?: number
}

// Re-export shared interfaces
export type { IQueryService, IShopifyIdMapper } from "../shared/services/shopify-id-mapper"
export type { IStreamWriter } from "../shared/services/stream-writer"

export interface ILocationResolver {
  resolveLocationsByIds(locationIds: Set<string>): Promise<Map<string, any>>
}

export interface IInventoryAggregator {
  aggregateInventoryByLocation(variant: any): Map<string, { stocked: number; reserved: number }>
}

export interface IInventoryRowBuilder {
  buildRows(
    variantId: string,
    perLocation: Map<string, { stocked: number; reserved: number }>,
    locationById: Map<string, any>,
    variant: any
  ): string[]
}
