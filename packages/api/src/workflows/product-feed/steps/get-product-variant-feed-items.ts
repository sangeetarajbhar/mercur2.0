/**
 * Product Variant Feed Items Step
 * Main orchestration step that coordinates all services
 * Follows Single Responsibility Principle - orchestrates the feed generation process
 */

import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { QueryContext } from "@medusajs/framework/utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createWriteStream } from "fs"
import { wrapVariantsWithSellerPricing } from "../../../api/utils/middlewares/products/variant-seller-pricing"

// Types and interfaces
import type { StepInput, IQueryService } from "./product-variant-feed/types"

// Services
import { LocationResolver } from "./product-variant-feed/services/location-resolver"
// import { ShopifyIdMapper } from "./shared/services/shopify-id-mapper"
import { VariantProcessor } from "./product-variant-feed/services/variant-processor"
import { CsvRowBuilder } from "./product-variant-feed/services/csv-row-builder"
import { StreamWriter } from "./shared/services/stream-writer"

// Validation
import { hasRequiredFields } from "./product-variant-feed/utils/validation"

// Constants
import { ALL_COLUMNS } from "./product-variant-feed/constants"

export const getProductVariantFeedItemsStep = createStep(
  "get-product-variant-feed-items",
  async (input: StepInput, { container }) => {
    // const stepStartTime = Date.now()
    // console.log('[product-variant-feed] Workflow started', {
    //   filePath: input.filePath,
    //   loop: input.loop,
    //   page_size: input.page_size,
    //   timestamp: new Date().toISOString(),
    // })

    const query = container.resolve(ContainerRegistrationKeys.QUERY) as IQueryService
    const configModule = container.resolve(
      ContainerRegistrationKeys.CONFIG_MODULE
    )
    const storefrontUrl = process.env.STORE_URL || "https://zilo.one"

    // Initialize services (Dependency Injection)
    const locationResolver = new LocationResolver(query, container)
    // const shopifyIdMapper = new ShopifyIdMapper(query)
    const csvRowBuilder = new CsvRowBuilder(ALL_COLUMNS)
    const streamWriter = new StreamWriter(
      createWriteStream(input.filePath, { encoding: 'utf-8', flags: 'a' })
    )

    // Configuration
    const pageSize = input.page_size
      ? Math.min(Math.max(Math.floor(input.page_size), 10), 500)
      : 50
    const currencyCode = "inr"
    const maxLoops = input.loop ? Math.floor(input.loop) : undefined

    // Resolve region
    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id"],
      filters: {},
    })

    const regionCount = regions?.length || 0
    if (!regionCount) {
      await streamWriter.end()
      return new StepResponse({ filePath: input.filePath, rowCount: 0 })
    }

    const defaultRegion = regions?.[0]
    const regionId = defaultRegion?.id

    // Resolve location IDs
    const locationIds = await locationResolver.resolveLocationIds()
    if (locationIds.length === 0) {
      await streamWriter.end()
      return new StepResponse({ filePath: input.filePath, rowCount: 0 })
    }

    // Initialize variant processor
    const variantProcessor = new VariantProcessor(
      container,
      locationIds,
      regionId,
      currencyCode,
      storefrontUrl
    )

    // Processing state
    let offset = 0
    let count = 0
    let totalRowCount = 0
    let loopCounter = 0
    let reachedLimit = false
    // const seenVariantIds = new Set<string>()
    // const seenProductIds = new Set<string>()

    try {
      do {
        const take = pageSize
        // const queryStartTime = Date.now()
        // Fetch products
        const { data: products, metadata } = await query.graph({
          entity: 'product',
          fields: [
            "id",
            "title",
            "description",
            "handle",
            "thumbnail",
            "images.*",
            "status",
            "attribute_values.*",
            "attribute_values.attribute.*",
            "categories.*",
            "categories.attributes.*",
            "type.value",
            "variants.*",
            "options.*",
            "options.values.*",
            "variants.options.*",
            "variants.options.option.*",
            "variants.calculated_price.*",
            "variants.ean",
            "variants.inventory_items.inventory.location_levels.location_id",
            "variants.inventory_items.inventory.location_levels.stocked_quantity",
            "variants.inventory_items.inventory.location_levels.reserved_quantity",
            "brand.name",
          ],
          filters: {
            status: "published",
          },
          context: {
            variants: {
              calculated_price: QueryContext({
                region_id: regionId,
                currency_code: currencyCode,
              }),
            },
          },
          pagination: {
            take,
            skip: offset
          }
        })

        count = metadata?.count ?? 0
        offset += take

        // const queryTime = Date.now() - queryStartTime
        // console.log('[product-variant-feed] Query completed', {
        //   loopCounter: loopCounter + 1,
        //   queryTimeMs: queryTime,
        //   productsFetched: products?.length || 0,
        //   totalProducts: count,
        // })

        // --- Legacy: full block from git (disabled). Uncomment import + `shopifyIdMapper` init; add `shopifyIds` to processVariant. ---
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

        // Collect all variants from this batch for bulk pricing processing
        const batchVariants: Array<{ variant: any; product: any }> = []

        for (const product of products) {
          // if (!product?.id || seenProductIds.has(product.id)) {
          //   continue
          // }
          // seenProductIds.add(product.id)

          if (!product.variants.length) {
            continue
          }

          for (const variant of product.variants) {
            // if (!variant?.id || seenVariantIds.has(variant.id)) {
            //   continue
            // }
            batchVariants.push({ variant, product })
          }
        }

        // Batch process all variants with seller pricing (single query instead of N queries)
        if (batchVariants.length > 0) {
          const variantsToProcess = batchVariants.map(({ variant }) => variant)
          await wrapVariantsWithSellerPricing(
            container,
            variantsToProcess,
            { currency_code: currencyCode, region_id: regionId },
            {
              location_ids: locationIds,
              filterToSingleSeller: true,
            }
          )
        }

        // Process products and build CSV rows
        const batchRows: string[] = []

        for (const { variant, product } of batchVariants) {
          const feedItem = await variantProcessor.processVariant(
            variant,
            product,
            // shopifyIdBySku,
            locationIds,
            regionId,
            currencyCode,
            storefrontUrl
          )

          if (!feedItem) {
            continue
          }

          // Validate required fields before adding to batch
          if (!hasRequiredFields(feedItem)) {
            continue
          }

          // seenVariantIds.add(variant.id)
          const row = csvRowBuilder.buildRow(feedItem)
          batchRows.push(row)
        }

        // Write CSV rows for this batch
        if (batchRows.length > 0) {
          // const writeStartTime = Date.now()
          const batchContent = csvRowBuilder.buildBatch(batchRows)
          await streamWriter.write(batchContent)
          // const writeTime = Date.now() - writeStartTime
          totalRowCount += batchRows.length

          // console.log('[product-variant-feed] Batch write completed', {
          //   loopCounter: loopCounter + 1,
          //   pageSize: take,
          //   rowsInBatch: batchRows.length,
          //   totalRows: totalRowCount,
          //   csvWriteTimeMs: writeTime,
          // })
        }

        loopCounter += 1

        if (maxLoops && loopCounter >= maxLoops) {
          reachedLimit = true
          break
        }
      } while (!reachedLimit && count > offset)

      // Close the stream
      await streamWriter.end()

      // const totalTime = Date.now() - stepStartTime
      // console.log('[product-variant-feed] Workflow completed', {
      //   totalTimeMs: totalTime,
      //   totalTimeSeconds: Math.ceil(totalTime / 1000),
      //   totalRows: totalRowCount,
      //   totalLoops: loopCounter,
      //   timestamp: new Date().toISOString(),
      // })

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

// Re-export types for external use
export type { VariantFeedItem } from "./product-variant-feed/types"
