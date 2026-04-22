import { CartDTO, CartShippingMethodDTO } from '@medusajs/framework/types'
import { createWorkflow, transform } from '@medusajs/framework/workflows-sdk'
import {
  addShippingMethodToCartStep,
  addShippingMethodToCartWorkflow,
  useQueryGraphStep
} from '@medusajs/medusa/core-flows'

import sellerShippingOptionLink from '@mercurjs/core-plugin/links/shipping-option-seller-link'
import { validateCartShippingOptionsStep } from '../steps'

type AddSellerShippingMethodToCartWorkflowInput = {
  cart_id: string
  option: {
    id: string
    data?: Record<string, any>
  }
}

export const customAddSellerShippingMethodToCartWorkflow = createWorkflow(
  'custom-add-seller-shipping-method-to-cart',
  function (input: AddSellerShippingMethodToCartWorkflowInput) {
    const { data: carts } = useQueryGraphStep({
      entity: 'cart',
      filters: {
        id: input.cart_id
      },
      fields: ['id', 'shipping_methods.*'],
      options: { throwIfKeyNotFound: true }
    }).config({ name: 'cart-query' })

    const validateCartShippingOptionsInput = transform(
      { carts: carts as unknown as CartDTO[], option: input.option },
      ({ carts, option }) => {
        const cart = carts[0]!
        const existingOptionIds = (cart.shipping_methods ?? [])
          .map((method) => method.shipping_option_id)
          .filter((id): id is string => Boolean(id))

        return {
          cart_id: cart.id,
          option_ids: [...existingOptionIds, option.id]
        }
      }
    )

    validateCartShippingOptionsStep(validateCartShippingOptionsInput)

    const addShippingMethodToCartInput = transform(
      input,
      ({ cart_id, option }) => ({
        cart_id,
        options: [option]
      })
    )

    // default addShippingMethodToCartWorkflow will replace all existing shippings methods in the cart
    addShippingMethodToCartWorkflow.runAsStep({
      input: addShippingMethodToCartInput
    })

    const shippingOptions = transform(
      { carts: carts as unknown as CartDTO[], newShippingOption: input.option },
      ({ carts, newShippingOption }) => {
        const cart = carts[0]!
        return [
          ...(cart.shipping_methods ?? [])
            .map((sm) => sm?.shipping_option_id)
            .filter((id): id is string => Boolean(id)),
          newShippingOption.id
        ]
      }
    )

    const { data: sellerShippingOptions } = useQueryGraphStep({
      entity: sellerShippingOptionLink.entryPoint,
      fields: ['shipping_option.*', 'seller_id'],
      filters: {
        shipping_option_id: shippingOptions
      }
    }).config({ name: 'seller-shipping-option-query' })

    const shippingMethodsToAddInput = transform(
      {
        carts: carts as unknown as CartDTO[],
        sellerShippingOptions,
        newShippingOption: input.option
      },
      ({ carts, sellerShippingOptions, newShippingOption }) => {
        const cart = carts[0]!
        const shippingOptionToSellerMap = new Map(
          sellerShippingOptions.map((option) => [
            option.shipping_option.id,
            option.seller_id
          ])
        )

        const existingShippingMethodsBySeller = new Map<
          string,
          CartShippingMethodDTO
        >()

        for (const method of cart.shipping_methods ?? []) {
          if (!method?.shipping_option_id) {
            continue
          }

          const sellerId = shippingOptionToSellerMap.get(method.shipping_option_id)
          existingShippingMethodsBySeller.set(sellerId, method as any)
        }

        const newOptionSellerId = shippingOptionToSellerMap.get(
          newShippingOption.id
        )!

        // Remove any existing shipping method for the same seller
        // since we're replacing it with the new option
        if (existingShippingMethodsBySeller.has(newOptionSellerId)) {
          existingShippingMethodsBySeller.delete(newOptionSellerId)
        }

        return Array.from(existingShippingMethodsBySeller.values()).map(
          (method) => ({
            shipping_option_id: method.shipping_option_id,
            cart_id: cart.id,
            name: method.name,
            data: method.data,
            amount: method.amount,
            is_tax_inclusive: method.is_tax_inclusive
          })
        )
      }
    )

    addShippingMethodToCartStep({
      shipping_methods: shippingMethodsToAddInput
    })
  }
)
