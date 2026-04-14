import knex  from 'knex'
import { container } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

/**
 * Input type for mapping cart items to sellers
 */
type MapCartItemsToSellersInput = {
  cart: any
}

/**
 * Output type for cart items to sellers mapping
 */
type MapCartItemsToSellersOutput = {
  cartItemToSellerMapping: Record<string, string>
  variantToSellerMapping: Record<string, string>
}

/**
 * Maps cart items and their variants to sellers through inventory items.
 *
 * This function performs a two-step database lookup:
 * 1. Queries product_variant_inventory_item table to get inventory items for each variant
 * 2. Queries seller_seller_inventory_inventory_item table to map inventory items to sellers
 *
 * @param cartId - The ID of the cart being processed
 * @param variantIds - Array of variant IDs from the cart items
 * @param cart - The cart object containing items and metadata
 * @param knex - Knex database connection instance
 * @returns Promise containing mappings for both cart items and variants to sellers
 */
async function mapCartItemsAndVariantsToSeller(
  cartId: string,
  variantIds: string[],
  cart: any,
  knex
): Promise<{
  cartItemToSellerMapping: Record<string, string>
  variantToSellerMapping: Record<string, string>
}> {
  // Step 1: Get inventory items for variants
  const inventoryResult = await knex.raw(`
    SELECT 
      cli.id as cart_item_id,
      pv.id as variant_id,
      pvii.inventory_item_id
    FROM 
      cart_line_item cli
    JOIN 
      product_variant pv ON cli.variant_id = pv.id
    JOIN 
      product_variant_inventory_item pvii ON pv.id = pvii.variant_id
    WHERE 
      cli.cart_id = '${cartId}'
  `)

  const inventoryItems = inventoryResult?.rows || []
  if (inventoryItems.length === 0) {
    return { cartItemToSellerMapping: {}, variantToSellerMapping: {} }
  }

  // Step 2: Get seller inventory items
  const sellerResult = await knex.raw(`
    SELECT 
      pvii.variant_id,
      ssii.seller_id,
      ssii.inventory_item_id
    FROM 
      product_variant_inventory_item pvii
    JOIN 
      seller_seller_inventory_inventory_item ssii ON pvii.inventory_item_id = ssii.inventory_item_id
    WHERE 
      pvii.variant_id IN (${variantIds.map((id) => `'${id}'`).join(',')})
  `)

  // Create mapping of variant IDs to seller IDs (for backward compatibility)
  const variantToSellerMapping = {}

  // Create mapping of cart item IDs to seller IDs
  const cartItemToSellerMapping = {}

  // Create a mapping of inventory items to sellers
  const inventoryItemToSellerMapping = {}

  // Create a mapping of variants to multiple sellers (for multi-seller scenarios)
  const variantToSellersMapping = {}

  for (const row of sellerResult?.rows || []) {
    if (row.inventory_item_id && row.seller_id) {
      inventoryItemToSellerMapping[row.inventory_item_id] = row.seller_id
    }

    // Track all sellers for each variant (for multi-seller scenarios)
    const variantId = row.variant_id
    if (variantId && row.seller_id) {
      // variantToSellerMapping[variantId] = row.seller_id
      if (!variantToSellersMapping[variantId]) {
        variantToSellersMapping[variantId] = []
      }
      if (!variantToSellersMapping[variantId].includes(row.seller_id)) {
        variantToSellersMapping[variantId].push(row.seller_id)
      }

      // Keep the old variant mapping for backward compatibility (use first seller found)
      if (!variantToSellerMapping[variantId]) {
        variantToSellerMapping[variantId] = row.seller_id
      }
    }
  }

  // Now map each cart item to its seller using the inventory item

  // Get all unique sellers available across all variants for global distribution
  const allAvailableSellers = new Set<string>()
  Object.values(variantToSellersMapping).forEach((sellers:string[]) => {
    sellers.forEach(seller => allAvailableSellers.add(seller))
  })
  const globalSellersList = Array.from(allAvailableSellers)

  // Global round-robin counter for distributing across all sellers
  let globalSellerCounter = 0

  for (const cartItem of cart.items) {
    if (!cartItem.variant?.id) continue

    // Check if seller_id is directly specified in item seller
    if (cartItem.seller && cartItem.seller.id) {
      const sellerId = cartItem.seller.id
      cartItemToSellerMapping[cartItem.id] = sellerId
      continue
    }

    // Check if this variant has multiple sellers available
    const variantId = cartItem.variant.id
    const availableSellers = variantToSellersMapping[variantId] || []

    if (availableSellers.length > 1 && globalSellersList.length > 1) {
      // Multiple sellers available globally - use global round-robin distribution
      // Find the next seller from global list that's also available for this variant
      let selectedSeller:any = null
      let attempts = 0

      while (!selectedSeller && attempts < globalSellersList.length) {
        const candidateSeller = globalSellersList[globalSellerCounter % globalSellersList.length]
        if (availableSellers.includes(candidateSeller)) {
          selectedSeller = candidateSeller
        }
        globalSellerCounter++
        attempts++
      }

      if (selectedSeller) {
        cartItemToSellerMapping[cartItem.id] = selectedSeller
        continue
      }
    }

    // Single seller or fallback logic
    // Find the inventory item for this cart item
    const matchingInventoryItem = inventoryItems.find(
      (inv) => inv.cart_item_id === cartItem.id
    )

    if (matchingInventoryItem) {
      const sellerId =
        inventoryItemToSellerMapping[
          matchingInventoryItem.inventory_item_id
        ]
      if (sellerId) {
        cartItemToSellerMapping[cartItem.id] = sellerId
      }
    } else {
      // Alternative: Try to find by variant ID
      const variantInventoryItem = inventoryItems.find(
        (inv) => inv.variant_id === cartItem.variant.id
      )

      if (variantInventoryItem) {
        const sellerId =
          inventoryItemToSellerMapping[
            variantInventoryItem.inventory_item_id
          ]
        if (sellerId) {
          cartItemToSellerMapping[cartItem.id] = sellerId
        }
      }
    }
  }

  return { cartItemToSellerMapping, variantToSellerMapping }
}

/**
 * Step to map cart items and variants to sellers through database queries
 */
export const mapCartItemsToSellersStep = createStep(
  'map-cart-items-to-sellers',
  async (
    input: MapCartItemsToSellersInput
  ): Promise<StepResponse<MapCartItemsToSellersOutput>> => {
    const { cart } = input

    // Only proceed if cart has items
    if (!cart.items || cart.items.length === 0) {
      return new StepResponse({
        cartItemToSellerMapping: {},
        variantToSellerMapping: {}
      })
    }

    const variantIds = cart.items
      .filter((item) => item?.variant?.id)
      .map((item) => item.variant.id)

    if (variantIds.length === 0) {
      return new StepResponse({
        cartItemToSellerMapping: {},
        variantToSellerMapping: {}
      })
    }

    // Get database connection through the container
    const knex = container.resolve(
      ContainerRegistrationKeys.PG_CONNECTION
    )

    if (!knex) {
      return new StepResponse({
        cartItemToSellerMapping: {},
        variantToSellerMapping: {}
      })
    }

    // Call the mapping function
    const { cartItemToSellerMapping, variantToSellerMapping } =
      await mapCartItemsAndVariantsToSeller(
        cart.id,
        variantIds,
        cart,
        knex
      )

    return new StepResponse({
      cartItemToSellerMapping,
      variantToSellerMapping
    })
  }
)
