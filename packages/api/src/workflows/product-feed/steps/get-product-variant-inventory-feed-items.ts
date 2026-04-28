/**
 * Product Variant Inventory Feed Items Step
 * Main orchestration step that coordinates all services
 * Follows Single Responsibility Principle - orchestrates the inventory feed generation process
 */

import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createWriteStream } from "fs"

// Types and interfaces
import type { StepInput, IQueryService } from "./product-variant-inventory-feed/types"

// Services
import { LocationResolver } from "./product-variant-inventory-feed/services/location-resolver"
import { InventoryAggregator } from "./product-variant-inventory-feed/services/inventory-aggregator"
import { InventoryRowBuilder } from "./product-variant-inventory-feed/services/inventory-row-builder"
// Legacy Shopify feed id (full path commented below):
// import { ShopifyIdMapper } from "./shared/services/shopify-id-mapper"
// import { FeedIdBuilder } from "./product-variant-inventory-feed/services/feed-id-builder"
import { StreamWriter } from "./shared/services/stream-writer"
export const getProductVariantInventoryFeedItemsStep = createStep(
  "get-product-variant-inventory-feed-items",
  async (input: StepInput, { container }) => {
    const stepStartTime = Date.now()

    const query = container.resolve(ContainerRegistrationKeys.QUERY) as IQueryService

    // Initialize services (Dependency Injection)
    const locationResolver = new LocationResolver(query)
    // const shopifyIdMapper = new ShopifyIdMapper(query)
    const inventoryAggregator = new InventoryAggregator()
    const inventoryRowBuilder = new InventoryRowBuilder()
    const streamWriter = new StreamWriter(
      createWriteStream(input.filePath, {
        encoding: 'utf-8',
        flags: 'a'
      })
    )

    // Configuration
    const limit = input.page_size
      ? Math.min(Math.max(Math.floor(input.page_size), 10), 500)
      : 100
    const maxLoops = input.loop ? Math.floor(input.loop) : undefined

    // Processing state
    let offset = 0
    let count = 0
    let totalRowCount = 0
    let loopCounter = 0
    let reachedLimit = false

    try {
      do {
        const queryStartTime = Date.now()

        // Fetch products
        const {
          data: products,
          metadata,
        } = await query.graph({
          entity: "product",
          fields: [
            "id",
            "status",
            "variants.id",
            "variants.manage_inventory",
            "variants.ean",
            "variants.sku",
            "variants.inventory_items.inventory.location_levels.location_id",
            "variants.inventory_items.inventory.location_levels.stocked_quantity",
            "variants.inventory_items.inventory.location_levels.reserved_quantity",
          ],
          filters: {
            status: "published",
          },
          pagination: {
            take: limit,
            skip: offset,
          },
        })

        count = metadata?.count ?? 0
        offset += limit

        const queryTime = Date.now() - queryStartTime

        // --- Legacy Shopify inventory (full block from git pre–variant-id feed; disabled). ---
        // // Collect SKUs for Shopify mapping
        // const pageSkus = new Set<string>()
        // for (const product of products as any[]) {
        //   for (const variant of product?.variants || []) {
        //     if (variant?.sku) {
        //       pageSkus.add(variant.sku)
        //     }
        //   }
        // }
        //
        // // Map SKUs to Shopify IDs
        // const shopifyIdBySku = await shopifyIdMapper.mapSkusToShopifyIds(pageSkus)

        // Collect unique stock location ids for this chunk
        const locationIds = new Set<string>()

        for (const product of products) {
          for (const variant of product.variants || []) {
            for (const invItem of (variant as any).inventory_items || []) {
              for (const level of invItem.inventory?.location_levels || []) {
                if (level.location_id) {
                  locationIds.add(level.location_id)
                }
              }
            }
          }
        }

        // Resolve locations
        const locationById = await locationResolver.resolveLocationsByIds(locationIds)

        // Process products and build CSV rows
        const batchRows: string[] = []

        for (const product of products) {
          if (!product.variants?.length) {
            continue
          }

          for (const variant of product.variants) {
            if (product.id == null || variant.id == null) {
              continue
            }

            // Aggregate inventory per stock location
            const perLocation = inventoryAggregator.aggregateInventoryByLocation(variant)

            const variantId = String(variant.id)

            // Legacy: single `id` via FeedIdBuilder (shopify_IN_* or zilo_IN_*); buildRows(feedId, ...) — different arity than current Medusa variant id path.
            // // Build feed ID (Shopify mapping when present, else Medusa zilo_IN_* — aligns with product variant feed)
            // const sku = variant.sku as string | undefined
            // const shopifyIds = sku ? shopifyIdBySku.get(sku) : undefined
            // const feedId = FeedIdBuilder.buildFeedId(shopifyIds, {
            //   productId: String(product.id),
            //   variantId: String(variant.id),
            // })
            //
            // // Only emit rows when feed ID is present
            // if (!feedId) {
            //   continue
            // }
            //
            // const variantRows = inventoryRowBuilder.buildRows(
            //   feedId,
            //   perLocation,
            //   locationById,
            //   variant
            // )

            // Regional inventory: id = Medusa variant id; region_id = warehouse code; availability
            const variantRows = inventoryRowBuilder.buildRows(
              variantId,
              perLocation,
              locationById,
              variant
            )
            batchRows.push(...variantRows)
          }
        }

        // Write CSV rows for this batch
        if (batchRows.length > 0) {
          const writeStartTime = Date.now()
          const batchContent = batchRows.join("\n") + "\n"
          await streamWriter.write(batchContent)
          const writeTime = Date.now() - writeStartTime
          totalRowCount += batchRows.length

        }

        loopCounter += 1

        if (maxLoops && loopCounter >= maxLoops) {
          reachedLimit = true
          break
        }
      } while (!reachedLimit && count > offset)

      // Close the stream
      await streamWriter.end()

      const totalTime = Date.now() - stepStartTime


      return new StepResponse({
        filePath: input.filePath,
        rowCount: totalRowCount,
      })
    } catch (error) {
      streamWriter.destroy()
      throw error
    }
  }
)
