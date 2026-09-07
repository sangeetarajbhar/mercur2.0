import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  container
} from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import customerWishlist from '../../../links/customer-wishlist'
import { createWishlistEntryWorkflow } from '../../../workflows/wishlist/workflows'
import { StoreCreateWishlistType } from './validators'
import wishlistProduct from '../../../links/wishlist-product'

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateWishlistType>,
  res: MedusaResponse
) => {
  // Pre-validate product id when reference is product
  if (req.validatedBody?.reference === 'product') {
    const productId = req.validatedBody?.reference_id
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['id'],
      filters: { id: productId },
      pagination: { skip: 0, take: 1 }
    })

    if (!products?.length) {
      return res.status(400).json({
        type: 'invalid_data',
        message: 'Invalid product id'
      })
    }
  }

  const { result } = await createWishlistEntryWorkflow.run({
    container: req.scope,
    input: {
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id
    }
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [wishlist]
  } = await query.graph({
    entity: 'wishlist',
    fields: req.queryConfig.fields,
    filters: {
      id: result.id
    }
  })

  res.status(201).json({ wishlist })
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const offset = (req as any)?.queryConfig?.pagination?.skip ?? 0
  const limit = (req as any)?.queryConfig?.pagination?.take ?? 25

  // 1) Get wishlist id
  const { data: [wl] } = await query.graph({
    entity: customerWishlist.entryPoint,
    fields: ['wishlist.id'],
    filters: { customer_id: req.auth_context.actor_id },
    pagination: { skip: 0, take: 1 }
  })
  const wishlistId = wl?.wishlist?.id
  if (!wishlistId) return res.json({ wishlists: { products: [] }, count: 0, offset: 0, limit: 0 })

  // 2) Get paginated products for wishlist
  const { data: products, metadata } = await query.graph({
    entity: wishlistProduct.entryPoint,
    fields: ['product_id'],
    filters: {
      wishlist_id: wishlistId,
    },
    pagination: { skip: offset, take: limit }
  })

  res.json({
    wishlists: { id: wishlistId, products },
    count: metadata?.count ?? 0,
    offset: offset,
    limit: limit
  })
}

