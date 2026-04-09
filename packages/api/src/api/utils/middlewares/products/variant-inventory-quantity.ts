import {
  ContainerRegistrationKeys,
  getTotalVariantAvailability,
  getVariantAvailability,
  MedusaError,
} from "@medusajs/framework/utils"
import { MedusaRequest, MedusaStoreRequest } from "@medusajs/framework/http"
import { transformAndValidateSalesChannelIds } from "./filter-by-valid-sales-channels"
import sellerStockLocation from '@mercurjs/core-plugin/links/stock-location-seller-link'

export const wrapVariantsWithTotalInventoryQuantity = async (
  req: MedusaRequest,
  variants: VariantInput[]
) => {
  const variantIds = (variants ?? []).map((variant) => variant.id).flat(1)

  if (!variantIds.length) {
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as Query
  const availability = await getTotalVariantAvailability(query, {
    variant_ids: variantIds,
  })

  wrapVariants(variants, availability)
}

export const wrapVariantsWithInventoryQuantityForSalesChannel = async (
  req: MedusaStoreRequest<unknown>,
  variants: VariantInput[],
  extraData?: { seller_id?: string; location_ids?: string[] }
) => {
  const salesChannelIds = transformAndValidateSalesChannelIds(req)

  const publishableApiKeySalesChannelIds =
    req.publishable_key_context.sales_channel_ids ?? []

  let channelsToUse: string

  if (publishableApiKeySalesChannelIds.length === 1) {
    channelsToUse = publishableApiKeySalesChannelIds[0]
  } else if (salesChannelIds.length === 1) {
    channelsToUse = salesChannelIds[0]
  } else {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Inventory availability cannot be calculated in the given context. Either provide a single sales channel id or configure a single sales channel in the publishable key`
    )
  }

  variants ??= []
  const variantIds = variants.map((variant) => variant.id).flat(1)

  if (!variantIds.length) {
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as Query

  // This is the core function that gets the availability
  // const availability = await getVariantAvailability(query, {
  //   variant_ids: variantIds,
  //   sales_channel_id: channelsToUse,
  // })

  // Get seller & location_ids from extraData if available
  const { seller_id, location_ids } = extraData || {}

  // Use seller-specific inventory availability
  const availability = await getVariantAvailabilityForSeller(query, {
    variant_ids: variantIds,
    sales_channel_id: channelsToUse,
    seller_id,
    location_ids
  })

  wrapVariants(variants, availability)
}

type VariantInput = {
  id: string
  inventory_quantity?: Record<string, any>
  manage_inventory?: boolean
}

type VariantAvailability = Awaited<
  ReturnType<typeof getTotalVariantAvailability>
>

const wrapVariants = (
  variants: VariantInput[],
  availability: VariantAvailability
) => {
  for (const variant of variants) {
    if (!variant.manage_inventory) {
      continue
    }

    // Set the inventory quantity based on the availability data
    // This includes quantities from all specified locations (dark store + omni store)
    variant.inventory_quantity = availability[variant.id];
  }
}

type GetVariantAvailabilityOptions = {
  variant_ids: string[]
  sales_channel_id: string
  seller_id?: string
  location_ids?: string[]
}

type Query = any

const getVariantAvailabilityForSeller = async (query: Query, options: GetVariantAvailabilityOptions) => {
  const { variant_ids, sales_channel_id, seller_id, location_ids } = options

  if (!variant_ids?.length) {
    return {}
  }

  try {
    // Step 1: Get the standard availability data
    const standardAvailability = await getVariantAvailability(query, {
      variant_ids,
      sales_channel_id,
    })

    // Step 2: Get the variant-seller mapping
    // First get inventory items for all variants
    const inventoryItemsResult = await query.graph({
      entity: 'product_variant_inventory_item',
      fields: ['variant_id', 'inventory_item_id'],
      filters: {
        variant_id: variant_ids
      }
    })

    const inventoryItems = inventoryItemsResult.data || []

    if (!inventoryItems.length) {
      return standardAvailability
    }

    const inventoryItemIds = inventoryItems.map((item: any) => item.inventory_item_id)

    // Get inventory levels for these inventory items
    const inventoryLevelsFilters: any = {
      inventory_item_id: inventoryItemIds
    }

    // If specific locations are provided, filter by them
    if (location_ids && location_ids.length > 0) {
      inventoryLevelsFilters.location_id = location_ids
    }

    const inventoryLevelsResult = await query.graph({
      entity: 'inventory_level',
      fields: ['inventory_item_id', 'location_id', 'stocked_quantity'],
      filters: inventoryLevelsFilters
    })

    const inventoryLevels = inventoryLevelsResult.data || []

    // Get location to seller mapping
    const locationIds = inventoryLevels.map((level: any) => level.location_id).filter(Boolean)

    // Get seller-location mapping with specific seller if provided
    const sellerLocationFilters: any = {
      stock_location_id: locationIds
    }

    if (seller_id) {
      sellerLocationFilters.seller_id = seller_id
    }

    const sellerLocationResult = await query.graph({
      entity: sellerStockLocation.entryPoint,
      fields: ['seller_id', 'stock_location_id'],
      filters: sellerLocationFilters
    })

    const sellerLocations = sellerLocationResult.data || []

    // Create a map of location_id -> seller_id[]
    const locationToSellerMap = new Map()
    sellerLocations.forEach((item: any) => {
      if (!locationToSellerMap.has(item.stock_location_id)) {
        locationToSellerMap.set(item.stock_location_id, [])
      }
      locationToSellerMap.get(item.stock_location_id).push(item.seller_id)
    })

    // Create a map of variant_id -> inventory_item_id[]
    const variantToInventoryMap = new Map()
    inventoryItems.forEach((item: any) => {
      if (!variantToInventoryMap.has(item.variant_id)) {
        variantToInventoryMap.set(item.variant_id, [])
      }
      variantToInventoryMap.get(item.variant_id).push(item.inventory_item_id)
    })

    const result = {}

    // Initialize the result structure
    variant_ids.forEach((variantId: any) => {
      result[variantId] = {}
    })

    // Populate the result with availability data by seller
    inventoryLevels.forEach((level: any) => {
      const sellerIds = locationToSellerMap.get(level.location_id) || []
      if (sellerIds.length === 0) return

      // Find which variant this inventory item belongs to
      for (const [variantId, inventoryItems] of variantToInventoryMap.entries()) {
        if (inventoryItems.includes(level.inventory_item_id)) {
          // Add entry for each seller
          sellerIds.forEach((sellerId: any) => {
            if (!result[variantId][sellerId]) {
              result[variantId][sellerId] = {
                availability: 0,
                sales_channel_id
              }
            }
            result[variantId][sellerId].availability += level.stocked_quantity
          })
        }
      }
    })

    // For any variant that doesn't have seller-specific data,
    // use the standard availability as a fallback
    Object.keys(standardAvailability).forEach((variantId: any) => {
      if (Object.keys(result[variantId]).length === 0) {
        // If we don't have seller-specific data, use the standard availability
        const defaultSellerId = 'default'
        result[variantId][defaultSellerId] = {
          availability: standardAvailability[variantId].availability,
          sales_channel_id
        }
      }
    })

    return result
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to get variant availability by seller: ${error.message}`
    )
  }
}

// Type definitions for enhanced type safety
interface VariantWithStockStatus extends VariantInput {
  calculated_price?: {
    min_price_seller_id?: string
  }
  seller_location_inventory_stock_status?: boolean
}

interface StockStatusExtraData {
  seller_id?: string
  location_ids?: string[]
  stockStatusSellerId?: string // The seller to use for stock status calculation
}

/**
 * Add seller_location_inventory_stock_status to variants based on specified seller
 * 
 * This function determines stock status for product variants by:
 * 1. Using the explicitly provided seller (if stockStatusSellerId is provided) OR the variant's min price seller
 * 2. Checking inventory availability in specified locations (cluster + child locations)
 * 3. Validating seller-location mapping
 * 4. Calculating total available inventory for that specific seller
 * 5. Setting status as "IN_STOCK" = true or "OUT_OF_STOCK" = false
 * 
 * @param req - Medusa request object containing scope and query resolver
 * @param variants - Array of product variants to process
 * @param extraData - Optional data containing seller_id, location_ids, and stockStatusSellerId
 */
export const wrapVariantsWithSellerLocationStockStatus = async (
  req: MedusaStoreRequest<unknown>,
  variants: VariantWithStockStatus[],
  extraData?: StockStatusExtraData
): Promise<void> => {
  // Input validation
  if (!variants?.length) {
    return
  }

  if (!req?.scope) {
    console.error('wrapVariantsWithSellerLocationStockStatus: Invalid request scope provided')
    // Default all variants to OUT_OF_STOCK for safety
    variants.forEach(variant => {
      (variant as any).seller_location_inventory_stock_status = false
    })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as Query
  const { location_ids = [], stockStatusSellerId } = extraData || {}
  try {
    // Process each variant individually for better error isolation
    for (const variant of variants) {
      try {
        // Check if inventory management is enabled
        if (!variant.manage_inventory) {
          ;(variant as any).seller_location_inventory_stock_status = true
          continue
        }

        // Get the seller to use for stock status calculation
        // Use the explicitly provided seller if available, otherwise fall back to variant's calculated min price seller
        const minPriceSellerId = stockStatusSellerId || variant.calculated_price?.min_price_seller_id

        if (!minPriceSellerId) {
          ;(variant as any).seller_location_inventory_stock_status = false
          continue
        }

        // Get inventory data for this specific variant and seller
        let totalInventory = 0

        // Step 1: Get inventory items for this variant
        const inventoryItemsResult = await query.graph({
          entity: 'product_variant_inventory_item',
          fields: ['variant_id', 'inventory_item_id'],
          filters: { variant_id: variant.id }
        })

        const inventoryItems = inventoryItemsResult.data || []

        if (inventoryItems.length > 0) {
          const inventoryItemIds = inventoryItems.map((item: any) => item.inventory_item_id)

          // Step 2: Get inventory levels for these inventory items with location filtering
          const inventoryLevelsFilters: any = {
            inventory_item_id: inventoryItemIds
          }

          // Apply location filtering if locations are specified
          if (location_ids.length > 0) {
            inventoryLevelsFilters.location_id = location_ids
          }

          const inventoryLevelsResult = await query.graph({
            entity: 'inventory_level',
            fields: ['inventory_item_id', 'location_id', 'stocked_quantity', 'reserved_quantity'],
            filters: inventoryLevelsFilters
          })

          const inventoryLevels = inventoryLevelsResult.data || []

          // Step 3: Check seller mappings to ALL provided locations (parent + child locations)
          const allLocationIds = location_ids.length > 0 ? location_ids : []

          if (allLocationIds.length > 0) {
            // Step 4: Check if the min price seller is mapped to ANY of the provided locations (parent OR child)
            const sellerLocationResult = await query.graph({
              entity: sellerStockLocation.entryPoint,
              fields: ['seller_id', 'stock_location_id'],
              filters: {
                seller_id: minPriceSellerId,
                stock_location_id: allLocationIds
              }
            })

            const sellerLocations = sellerLocationResult.data || []

            if (sellerLocations.length > 0) {
              // Step 5: Get the location IDs where this seller is mapped
              const sellerLocationIds = sellerLocations.map((item: any) => item.stock_location_id)
              // Step 6: Sum up inventory from locations where the seller is mapped
              totalInventory = inventoryLevels
                .filter((level: any) => sellerLocationIds.includes(level.location_id))
                .reduce((sum: number, level: any) => {
                  const availableQty = Math.max(0, (level.stocked_quantity || 0) - (level.reserved_quantity || 0))
                  return sum + availableQty
                }, 0)
            }
          }
        }

        // Step 7: Set stock status based on total inventory
        const stockStatus = totalInventory > 0 ? true : false
        ;(variant as any).seller_location_inventory_stock_status = stockStatus

      } catch (variantError) {
        // Handle individual variant errors gracefully
        console.error(`Error processing stock status for variant ${variant.id}:`, variantError)
        ;(variant as any).seller_location_inventory_stock_status = false
      }
    }

  } catch (error) {
    // Handle general errors by defaulting all variants to OUT_OF_STOCK
    console.error('wrapVariantsWithSellerLocationStockStatus: Critical error occurred:', error)
    variants.forEach(variant => {
      ;(variant as any).seller_location_inventory_stock_status = false
    })
  }
}

/**
 * Add seller_inventory object to each variant for all sellers
 * and filter sellers to only show those available in the location
 */
export const wrapVariantsWithSellerInventory = async (
  req: MedusaStoreRequest<unknown>,
  variants: VariantWithStockStatus[],
  extraData?: StockStatusExtraData
): Promise<void> => {
  // Input validation
  if (!variants?.length) {
    return
  }

  if (!req?.scope) {
    console.error('wrapVariantsWithSellerInventory: Invalid request scope provided')
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as Query
  const { location_ids = [] } = extraData || {}

  try {
    // Process each variant individually
    for (const variant of variants) {
      try {
        // Initialize seller_inventory object
        ;(variant as any).seller_inventory = {}

        // Check if inventory management is enabled
        if (variant?.manage_inventory === false) {
          // If inventory not managed, set all sellers as in stock
          const sellerPrices = (variant.calculated_price as any)?.seller_prices
          if (sellerPrices) {
            Object.keys(sellerPrices).forEach(sellerId => {
              ;(variant as any).seller_inventory[sellerId] = {
                seller_location_inventory_stock_status: true
              }
            })
          }
          continue
        }

        // Step 1: Get inventory items for this variant
        const inventoryItemsResult = await query.graph({
          entity: 'product_variant_inventory_item',
          fields: ['variant_id', 'inventory_item_id'],
          filters: { variant_id: variant.id }
        })

        const inventoryItems = inventoryItemsResult.data || []

        if (inventoryItems.length > 0) {
          const inventoryItemIds = inventoryItems.map((item: any) => item.inventory_item_id)

          // Step 2: Get inventory levels for these inventory items with location filtering
          const inventoryLevelsFilters: any = {
            inventory_item_id: inventoryItemIds
          }

          // Apply location filtering - location_ids already includes parent + child from PDP route
          if (location_ids.length > 0) {
            inventoryLevelsFilters.location_id = location_ids
          }

          const inventoryLevelsResult = await query.graph({
            entity: 'inventory_level',
            fields: ['inventory_item_id', 'location_id', 'stocked_quantity', 'reserved_quantity'],
            filters: inventoryLevelsFilters
          })

          const inventoryLevels = inventoryLevelsResult.data || []

          // Get unique location IDs from inventory levels (in case location_ids is not provided)
          const locationIdsFromInventory = [...new Set(inventoryLevels.map((level: any) => level.location_id).filter(Boolean))]
          
          // Use provided location_ids if available, otherwise use locations from inventory
          const allLocationIds = location_ids.length > 0 ? location_ids : locationIdsFromInventory
          
          if (allLocationIds.length > 0) {
            // Step 3: Get all sellers mapped to ALL locations (parent + child)
            const sellerLocationResult = await query.graph({
              entity: sellerStockLocation.entryPoint,
              fields: ['seller_id', 'stock_location_id'],
              filters: {
                stock_location_id: allLocationIds
              }
            })

            const sellerLocations = sellerLocationResult.data || []
            
            // Create a map of seller_id -> location_ids for quick lookup
            const sellerLocationMap = new Map<string, string[]>()
            sellerLocations.forEach((item: any) => {
              const sellerId = item.seller_id
              const locationId = item.stock_location_id
              if (!sellerLocationMap.has(sellerId)) {
                sellerLocationMap.set(sellerId, [])
              }
              sellerLocationMap.get(sellerId)!.push(locationId)
            })

            // Step 4: Calculate inventory for each seller
            const sellerPrices = (variant.calculated_price as any)?.seller_prices
            if (sellerPrices) {
              Object.keys(sellerPrices).forEach(sellerId => {
                const sellerLocationIds = sellerLocationMap.get(sellerId) || []
                
                if (sellerLocationIds.length > 0) {
                  // Calculate available inventory (stocked - reserved) from locations where seller is mapped
                  const filteredLevels = inventoryLevels.filter((level: any) => sellerLocationIds.includes(level.location_id))
                  
                  const totalAvailableInventory = filteredLevels.reduce((sum: number, level: any) => {
                    const availableQty = Math.max(0, (level.stocked_quantity || 0) - (level.reserved_quantity || 0))
                    return sum + availableQty
                  }, 0)
                  
                  ;(variant as any).seller_inventory[sellerId] = {
                    seller_location_inventory_stock_status: totalAvailableInventory > 0
                  }
                } else {
                  // Seller is not mapped to any of the provided locations
                  ;(variant as any).seller_inventory[sellerId] = {
                    seller_location_inventory_stock_status: false
                  }
                }
              })
            } else {
              // No seller prices found - this shouldn't happen normally, but handle gracefully
              console.warn(`Variant ${variant.id}: No seller_prices found in calculated_price`)
            }
          } else {
            // No location IDs available (neither provided nor from inventory)
            // Set all sellers as out of stock
            const sellerPrices = (variant.calculated_price as any)?.seller_prices
            if (sellerPrices) {
              Object.keys(sellerPrices).forEach(sellerId => {
                ;(variant as any).seller_inventory[sellerId] = {
                  seller_location_inventory_stock_status: false
                }
              })
            }
          }
        } else {
          // No inventory items, set all sellers as out of stock
          const sellerPrices = (variant.calculated_price as any)?.seller_prices
          if (sellerPrices) {
            Object.keys(sellerPrices).forEach(sellerId => {
              ;(variant as any).seller_inventory[sellerId] = {
                seller_location_inventory_stock_status: false
              }
            })
          }
        }

      } catch (variantError) {
        console.error(`Error processing seller inventory for variant ${variant.id}:`, variantError)
        // Set all sellers as out of stock on error
        const sellerPrices = (variant.calculated_price as any)?.seller_prices
        if (sellerPrices) {
          Object.keys(sellerPrices).forEach(sellerId => {
            ;(variant as any).seller_inventory[sellerId] = {
              seller_location_inventory_stock_status: false
            }
          })
        }
      }
    }

  } catch (error) {
    console.error('wrapVariantsWithSellerInventory: Critical error occurred:', error)
    // Set all sellers as out of stock on error
    variants.forEach(variant => {
      const sellerPrices = (variant.calculated_price as any)?.seller_prices
      if (sellerPrices) {
        Object.keys(sellerPrices).forEach(sellerId => {
          ;(variant as any).seller_inventory[sellerId] = {
            seller_location_inventory_stock_status: false
          }
        })
      }
    })
  }
}

/**
 * Filter sellers to only show those available in the specified location
 */
export const filterSellersByLocationAvailability = async (
  req: MedusaStoreRequest<unknown>,
  product: any,
  extraData?: StockStatusExtraData
): Promise<void> => {
  if (!req?.scope || !product?.sellers) {
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as Query
  const { location_ids = [] } = extraData || {}

  try {
    if (location_ids.length === 0) {
      // If no location filter, keep all sellers
      return
    }

    // Get all sellers mapped to the specified locations
    const sellerLocationResult = await query.graph({
      entity: sellerStockLocation.entryPoint,
      fields: ['seller_id', 'stock_location_id'],
      filters: {
        stock_location_id: location_ids
      }
    })

    const sellerLocations = sellerLocationResult.data || []
    const availableSellerIds = new Set(sellerLocations.map((item: any) => item.seller_id))

    // Filter sellers to only include those available in the location
    product.sellers = product.sellers.filter((seller: any) => 
      availableSellerIds.has(seller.id)
    )

  } catch (error) {
    console.error('filterSellersByLocationAvailability: Error occurred:', error)
    // On error, keep all sellers (don't filter)
  }
}
