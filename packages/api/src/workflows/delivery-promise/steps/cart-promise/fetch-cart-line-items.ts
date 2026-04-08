import { Knex } from 'knex'

export type CartLineItem = {
  id: string
  cart_id: string
  variant_id: string
  seller_id: string
  quantity: number
}

/**
 * Fetches cart line items with seller information
 * @param cart - Cart object with items
 * @param knex - Knex database connection
 * @returns Array of cart line items with seller info
 */
export async function fetchCartLineItems(
  cart: any,
  knex: Knex
): Promise<CartLineItem[]> {
  const lineItems: CartLineItem[] = []

  if (cart && cart.items && cart.items.length > 0) {
    // Use provided cart data to avoid redundant query - get only seller information
    const lineItemIds = cart.items.map((item: any) => item.id)

    // Get seller information for all line items in a single query
    const sellerData = await knex('seller_seller_cart_line_item')
      .select('line_item_id', 'seller_id')
      .whereIn('line_item_id', lineItemIds)
      .whereNull('deleted_at')

    // Create a map for quick lookup of seller information
    const sellerMap = new Map(sellerData.map(seller => [seller.line_item_id, seller.seller_id]))

    // Construct lineItems using cart data + seller information
    return cart.items.map((item: any) => ({
      id: item.id,
      cart_id: cart.id,
      variant_id: item.variant_id,
      seller_id: sellerMap.get(item.id),
      quantity: item.quantity
    }))
  }

  return lineItems
}

