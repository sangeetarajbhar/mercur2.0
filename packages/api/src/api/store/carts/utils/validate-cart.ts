import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

interface CartValidationResult {
  cartData: {
    id: string
    completed_at: Date | null
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

  const { data: carts } = await query.graph({
    entity: 'cart',
    filters: { id: cartId },
    fields: ['id', 'completed_at']
  })

  const cartData = carts?.[0] as any
  if (!cartData) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id: ${cartId} was not found`
    )
  }
  

  return {
    cartData: cartData,
    isCompleted: !!cartData.completed_at
  }
}

/**
 * Validates cart and throws an error if it's completed
 * @param cartId - The cart ID to validate
 * @param scope - The Medusa container scope
 * @returns Cart data if validation passes
 * @throws MedusaError if cart is not found or is completed
 */
export async function validateCartNotCompleted(
  cartId: string,
  scope: MedusaContainer
): Promise<{ id: string; completed_at: Date | null }> {
  const { cartData, isCompleted } = await validateCart(cartId, scope)

  if (isCompleted) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'CART_COMPLETED',
      `This cart is already completed. Please create a new cart.`
    )
  }

  return cartData
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
