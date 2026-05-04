import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { QueryGraphCacheKey, CacheTTLMap, CACHE_ENABLE } from '../../../../shared/utils/redisKey'

interface CartValidationResult {
  cartData: {
    id: string
    completed_at: string | Date | null
  }
  isCompleted: boolean
}

export interface CustomErrorResponse {
  success: false,
  status: string,
  message: string,
  cart_id?: string | null
}

/**
 * Validates if a cart exists and checks if it's completed
 * @param cartId - The cart ID to validate
 * @param scope - The Medusa container scope
 * @returns Cart validation result with cart data and completion status
 * @throws MedusaError if cart is not found
 */
export async function validateCart(
  cartId: string,
  scope: MedusaContainer
): Promise<CartValidationResult> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const ttl = CacheTTLMap[QueryGraphCacheKey.CHECK_CART_IS_COMPLETED]

  const { data: carts } = await query.graph({
      entity: 'cart',
      filters: { id: cartId },
      fields: ['id', 'completed_at']
    },
    {
      cache: {
        enable: CACHE_ENABLE,
        ttl: ttl,
        key: QueryGraphCacheKey.CHECK_CART_IS_COMPLETED+`${cartId}`
      }
    }
  )

  const cartData = carts?.[0]
  if (!cartData) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id: ${cartId} was not found`
    )
  }

  return {
    cartData: {
      id: cartData.id,
      completed_at: cartData.completed_at ?? null
    },
    isCompleted: !!cartData.completed_at
  }
}

/**
 * Returns a standardized error response for completed cart
 * @param cartId - The cart ID
 * @returns Error response object
 */
export function getCompletedCartErrorResponse(cartId: string) {
  return {
    success: false,
    status: 'CART_COMPLETED',
    message: 'This cart is already completed. Please create a new cart.',
    cart_id: cartId
  }
}

export function getCustomCartErrorResponse({
 cartId,
 status,
 message,
}: {
  cartId?: string | null
  status: string
  message: string
}): CustomErrorResponse {
  return {
    success: false,
    status,
    message,
    cart_id: cartId,
  }
}
