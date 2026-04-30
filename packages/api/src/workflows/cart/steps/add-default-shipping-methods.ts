import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules
} from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

type AddDefaultShippingMethodsInput = {
  cart_id: string
}

export const addDefaultShippingMethodsStep = createStep(
  'add-default-shipping-methods',
  async (input: AddDefaultShippingMethodsInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const cartService = container.resolve(Modules.CART)
    try {
      // Get cart with full shipping method details
      const {
        data: [cart]
      } = await query.graph({
        entity: 'cart',
        fields: ['id', 'shipping_methods.*', 'items.*'],
        filters: { id: input.cart_id }
      })

      if (!cart) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Cart with id ${input.cart_id} not found`
        )
      }

      // // If cart already has shipping methods, return them
      // if (cart.shipping_methods && cart.shipping_methods.length > 0) {
      //   console.log(
      //     `Cart ${input.cart_id} already has ${cart.shipping_methods.length} shipping methods`
      //   )

      //   // Map existing shipping methods to the expected format
      //   const existingShippingMethods = cart.shipping_methods.map(method => {
      //     // Try to extract seller_id from metadata if available
      //     const sellerId = method.metadata?.seller_id || '';

      //     return {
      //       seller_id: sellerId,
      //       shipping_option_id: method.shipping_option_id,
      //       name: method.name || 'Standard Shipping',
      //       amount: method.amount || 0
      //     };
      //   });

      //   console.log('Returning existing shipping methods:', existingShippingMethods);
      //   return new StepResponse({ addedShippingMethods: existingShippingMethods })
      // }

      // Get all seller IDs from cart items
      const sellerIds = new Set<string>()

      // for (const item of cart.items) {
      //   if (item.metadata && item.metadata.seller_id) {
      //     sellerIds.add(item.metadata.seller_id)
      //   }
      // }

      // Fetch seller mappings from seller_seller_cart_line_item table if knex is available
      if (knex && cart.id) {
        try {
          const sellerMappings = await knex("seller_seller_cart_line_item as sscli")
            .select([
              "sscli.line_item_id",
              "sscli.seller_id"
            ])
            .join(
              "cart_line_item as cli",
              "cli.id",
              "sscli.line_item_id"
            )
            .where("cli.cart_id", cart.id)
            .whereNull("cli.deleted_at")
            .whereNull("sscli.deleted_at")

          // Convert to a mapping object
          sellerMappings.forEach(mapping => {
            sellerIds.add(mapping.seller_id)
          })

        } catch (error) {
          console.error('Error fetching seller mappings:', error)
        }
      }

      if (sellerIds.size === 0) {
        console.log(`No seller IDs found in cart ${input.cart_id} items`)
        return new StepResponse({ addedShippingMethods: [] })
      }

      const addedShippingMethods: Array<{
        seller_id: string
        shipping_option_id: string
        name: string
        amount: number
      }> = []

      // For each seller, find their default shipping option
      for (const sellerId of Array.from(sellerIds)) {
        const { data: sellerShippingOptions } = await query.graph({
          entity: 'seller_shipping_option',
          // entity: sellerShippingOption.entryPoint,
          fields: ['shipping_option_id', 'shipping_option.*','shipping_option.service_zone.fulfillment_set.type'],
          filters: {
            seller_id: sellerId,
          },
          pagination: {
            order: { created_at: "asc" },
          }
        })


        console.log('sellerShippingOptions')
        console.dir(sellerShippingOptions, { depth: null })

        if (sellerShippingOptions && sellerShippingOptions.length > 0) {

          // Sort by price (lowest first) to get the most affordable default option
          // const sortedOptions = sellerShippingOptions.sort((a, b) => {
          //   const priceA = a.shipping_option?.amount || 0
          //   const priceB = b.shipping_option?.amount || 0
          //   return priceA - priceB
          // })

          // const defaultShippingOption = sortedOptions[0]

          // Only consider options whose fulfillment set type is "shipping" (exclude pickup)
          const shippingOnlyOptions = sellerShippingOptions.filter(
            (opt) => opt?.shipping_option?.service_zone?.fulfillment_set?.type === "shipping"
          )

          if (!shippingOnlyOptions.length) {
            console.log(`No shipping-type options found for seller ${sellerId}`)
            continue
          }

          const defaultShippingOption = shippingOnlyOptions[0]

          // error of isasync
          // addSellerShippingMethodToCartWorkflow.runAsStep({
          //   input: {
          //     cart_id: input.cart_id,
          //     option: {
          //       id: defaultShippingOption.shipping_option_id,
          //       data: {}
          //     }
          //   }
          // })

          // addSellerShippingMethodToCartWorkflow.run({
          //   input: {
          //     cart_id: input.cart_id,
          //     options: [
          //       {
          //         id: defaultShippingOption.shipping_option_id,
          //         data: {}
          //       }
          //     ]
          //   }
          // })

          // Use cart service directly to add shipping method (proper Medusa pattern)
          try {
            await cartService.addShippingMethods(input.cart_id, [
              {
                shipping_option_id: defaultShippingOption.shipping_option_id,
                name: defaultShippingOption.shipping_option?.name || 'Standard Shipping',
                amount: defaultShippingOption.shipping_option?.amount || 0,
                data: {}
              }
            ])

            addedShippingMethods.push({
              seller_id: sellerId,
              shipping_option_id: defaultShippingOption.shipping_option_id,
              name:
                defaultShippingOption.shipping_option?.name || 'Default Shipping',
              amount: defaultShippingOption.shipping_option?.amount || 0
            })

          } catch (error) {
            console.error(`Failed to add shipping method for seller ${sellerId}:`, error)
          }

        }
      }


      return new StepResponse({ addedShippingMethods })
    } catch (error) {
      console.error('Error in addDefaultShippingMethodsStep:', error)
      throw error
    }
  }
)
