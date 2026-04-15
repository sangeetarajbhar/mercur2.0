import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export const getCartContextStep = createStep(
  'get-cart-context',
  async (cartId: string, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Get cart with full context
    const { data: carts } = await query.graph({
      entity: 'cart',
      filters: { id: cartId },
      fields: [
        'id',
        'total',
        'subtotal',
        'tax_total',
        'discount_total',
        'shipping_total',
        'region_id',
        'customer_id',
        'metadata',
        'items.*',
        'items.variant.*',
        'items.variant.product.*',
        'items.variant.product.categories.*',
        'customer.*',
        'customer.groups.*',
        'region.*'
      ]
    })


    // 'customer.customer_groups.*',


    if (!carts.length) {
      throw new Error(`Cart with id ${cartId} not found`)
    }

    const cart = carts[0]

    // Build context object
    const context = {
      cart,
      customer: cart.customer || null,
      region: cart.region || null
    }

    return new StepResponse(context)
  }
)
