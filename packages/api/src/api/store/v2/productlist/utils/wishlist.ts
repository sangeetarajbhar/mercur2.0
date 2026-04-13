import { MedusaRequest } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import customerWishlist from '../../../../../links/customer-wishlist'

/**
 * Get wishlist product IDs for a customer (optimized)
 */
export async function getWishlistProductIds(
  req: MedusaRequest,
): Promise<Set<string>> {
  const authContext = (req as { auth_context?: { actor_id?: string } }).auth_context
  if (!authContext?.actor_id) {
    return new Set<string>()
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: wishlists } = await query.graph({
    entity: customerWishlist.entryPoint,
    fields: ['wishlist.products.id'],
    filters: {
      customer_id: authContext.actor_id,
    }
  })

  return new Set(
    (wishlists as Array<{ wishlist?: { products?: Array<{ id?: string }> } }>).flatMap((w) =>
      (w.wishlist?.products || [])
        .map((p) => p?.id)
        .filter((id): id is string => Boolean(id))
    )
  )
}

/**
 * Add wishlist flags to products if user is authenticated
 * Supports both YesPlz format (productId) and legacy format (id)
 */
export async function addWishlistFlagsToProducts(
  req: MedusaRequest,
  productList: unknown[]
): Promise<void> {
  const authContext = (req as { auth_context?: { actor_id?: string } }).auth_context
  if (!authContext?.actor_id || !productList || productList.length === 0) {
    return
  }

  const wishlistProductIds = await getWishlistProductIds(req)

  for (const product of productList) {
    if (product && typeof product === 'object') {
      const p = product as Record<string, unknown>
      const id = p.id ?? p.productId
      if (id != null) {
        p.in_wishlist = wishlistProductIds.has(String(id))
      }
    }
  }
}
