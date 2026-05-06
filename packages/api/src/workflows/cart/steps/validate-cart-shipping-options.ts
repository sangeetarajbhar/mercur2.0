import {
  ContainerRegistrationKeys,
  MedusaError,
  promiseAll
} from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import productSellerLink from '@mercurjs/core/links/product-seller-link'
import shippingOptionSellerLink from '@mercurjs/core/links/shipping-option-seller-link'

type ValidateCartShippingOptionsInput = {
  cart_id: string
  option_ids: string[]
}

export const validateCartShippingOptionsStep = createStep(
  'validate-cart-shipping-options',
  async (input: ValidateCartShippingOptionsInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    if (input.option_ids.length !== new Set(input.option_ids).size) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Some of the shipping methods are doubled!'
      )
    }

    const {
      data: [cart]
    } = await query.graph({
      entity: 'cart',
      fields: ['id', 'items.product_id'],
      filters: { id: input.cart_id }
    })

    const productIds = (cart?.items ?? [])
      .map((item) => item?.product_id)
      .filter((productId): productId is string => typeof productId === 'string' && productId.length > 0)

    const [{ data: sellerProducts }, { data: sellerShippingOptions }] =
      await promiseAll([
        query.graph({
          entity: productSellerLink.entryPoint,
          fields: ['seller_id', 'product_id'],
          filters: {
            product_id: productIds
          }
        }),
        query.graph({
          entity: shippingOptionSellerLink.entryPoint,
          fields: ['seller_id', 'shipping_option_id', 'shipping_option.*'],
          filters: {
            shipping_option_id: input.option_ids
          }
        })
      ])

    const sellers = new Set(sellerProducts.map((sp) => sp.seller_id))

    for (const sellerShippingOption of sellerShippingOptions) {
      if (!sellers.has(sellerShippingOption.seller_id)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Shipping option with id: ${sellerShippingOption.shipping_option_id} is not available for any of the cart items`
        )
      }
    }

    return new StepResponse({
      sellerProducts,
      sellerShippingOptions
    })
  }
)
