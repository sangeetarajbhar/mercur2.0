import {
    AdditionalData,
    UpdateCartWorkflowInputDTO
  } from '@medusajs/framework/types'
  import {
    CartWorkflowEvents,
    MedusaError,
    isDefined
  } from '@medusajs/framework/utils'
  import {
    WorkflowData,
    WorkflowResponse,
    createHook,
    createWorkflow,
    parallelize,
    transform,
    when
  } from '@medusajs/framework/workflows-sdk'
  import {
    deleteLineItemsStep,
    emitEventStep,
    findOrCreateCustomerStep,
    findSalesChannelStep,
    // refreshCartItemsWorkflow,
    updateCartsStep,
    useQueryGraphStep,
    useRemoteQueryStep,
  } from '@medusajs/medusa/core-flows'

  import { refreshCartItemsWorkflow } from './refresh-cart-items'

  import { CACHE_ENABLE, CacheTTLMap, UseQueryGraphStepCacheKey } from "../../../shared/utils/redisKey";
import { validateSalesChannelStep } from '../steps/validate-sales-channel'
import { validateCartDeliveryDataStep } from '../steps/validate-cart-delivery-data'
import { updateSlottedDeliveryDetailStep } from '../steps/update-slotted-delivery-detail'
import { updateStandardDeliveryDetailStep } from '../steps/update-standard-delivery-detail'

  /**
   * The data to update the cart, along with custom data that's passed to the workflow's hooks.
   */
  export type UpdateCartWorkflowInput = UpdateCartWorkflowInputDTO &
    AdditionalData

  export const updateCartWorkflowId = 'custom-update-cart'
  /**
   * This workflow updates a cart and returns it. You can update the cart's region, address, and more. This workflow is executed by the
   * [Update Cart Store API Route](https://docs.medusajs.com/api/store#carts_postcartsid).
   *
   * :::note
   *
   * This workflow doesn't allow updating a cart's line items. Instead, use {@link addToCartWorkflow} and {@link updateLineItemInCartWorkflow}.
   *
   * :::
   *
   * This workflow has a hook that allows you to perform custom actions on the updated cart. For example, you can pass custom data under the `additional_data` property of the Update Cart API route,
   * then update any associated details related to the cart in the workflow's hook.
   *
   * You can also use this workflow within your customizations or your own custom workflows, allowing you to wrap custom logic around updating a cart.
   *
   * @example
   * const { result } = await updateCartWorkflow(container)
   * .run({
   *   input: {
   *     id: "cart_123",
   *     region_id: "region_123",
   *     shipping_address: {
   *       first_name: "John",
   *       last_name: "Doe",
   *       address_1: "1234 Main St",
   *       city: "San Francisco",
   *       country_code: "US",
   *       postal_code: "94111",
   *       phone: "1234567890",
   *     },
   *     additional_data: {
   *       external_id: "123"
   *     }
   *   }
   * })
   *
   * @summary
   *
   * Update a cart's details, such as region, address, and more.
   *
   * @property hooks.validate - This hook is executed before all operations. You can consume this hook to perform any custom validation. If validation fails, you can throw an error to stop the workflow execution.
   * @property hooks.cartUpdated - This hook is executed after a cart is update. You can consume this hook to perform custom actions on the updated cart.
   */
  export const updateCartWorkflow = createWorkflow({
    name: updateCartWorkflowId,
  },
    (input: WorkflowData<UpdateCartWorkflowInput>) => {
      const cartToUpdate = useRemoteQueryStep({
        entry_point: 'cart',
        variables: { id: input.id },
        fields: [
          'id',
          'email',
          'customer_id',
          'sales_channel_id',
          'shipping_address.*',
          'region.*',
          'region.countries.*',
          'items.id',
          'items.product.product_configuration.is_try_and_buy',
          'items.product.product_configuration.id',
          'items.metadata'
        ],
        list: false,
        throw_if_key_not_found: true
      }).config({ name: 'get-cart' })

      const cartDataInput = transform({ input, cartToUpdate }, (data) => {
        return {
          sales_channel_id:
            data.input.sales_channel_id ?? data.cartToUpdate.sales_channel_id,
          customer_id: data.cartToUpdate.customer_id,
          email: data.input.email ?? data.cartToUpdate.email
        }
      })

      const [salesChannel, customer] = parallelize(
        findSalesChannelStep({
          salesChannelId: cartDataInput.sales_channel_id
        }),
        findOrCreateCustomerStep({
          customerId: cartDataInput.customer_id,
          email: cartDataInput.email
        })
      )

      validateSalesChannelStep({ salesChannel })

      const newRegion = when("check-region-id", { input }, (data) => {
        return !!data.input.region_id
      }).then(() => {
        const cartIdCacheKey = transform({ input }, ({ input }) => {
          return `${UseQueryGraphStepCacheKey.GET_REGION}${input.region_id}`
        })
        const ttl = CacheTTLMap[UseQueryGraphStepCacheKey.GET_REGION]

        const regionQuery = useQueryGraphStep({
          entity: 'region',
          fields: ['id', 'countries.*', 'currency_code', 'name'],
          filters: { id: input.region_id },
          options: {
            cache: {
              enable: CACHE_ENABLE,
              ttl: ttl,
              key: cartIdCacheKey
            },
          },
        }).config({ name: 'get-region' })

        return transform(
          { queryResult: regionQuery as unknown },
          ({ queryResult }) => {
            const { data: regions } = queryResult as {
              data?: Array<{
                id: string
                currency_code: string
                name: string
                countries: Array<{ iso_2?: string | null }>
              }>
            }
            return regions?.[0]
          }
        )
      })

      const region = transform({ cartToUpdate, newRegion }, (data) => {
        return data.newRegion ?? data.cartToUpdate.region
      })

      const cartInput = transform(
        {
          input,
          region,
          customer,
          salesChannel,
          cartToUpdate
        },
        (data) => {
          const {
            promo_codes, // eslint-disable-line @typescript-eslint/no-unused-vars
            additional_data: _additionalData, // eslint-disable-line @typescript-eslint/no-unused-vars
            ...updateCartData
          } = data.input

          const data_ = {
            ...updateCartData,
            currency_code: data.region?.currency_code,
            region_id: data.region?.id // This is either the region from the input or the region from the cart or null
          }

          // When the region is updated, we do a few things:
          // - We need to make sure the provided shipping address country code is in the new region
          // - We clear the shipping address if the new region has more than one country
          const regionIsNew = data.region?.id !== data.cartToUpdate.region?.id
          const shippingAddress = data.input.shipping_address

          if (shippingAddress?.country_code) {
            const country = data.region.countries.find(
              (c) => c.iso_2 === shippingAddress.country_code
            )

            if (!country) {
              throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                `Country with code ${shippingAddress.country_code} is not within region ${data.region.name}`
              )
            }

            data_.shipping_address = {
              ...shippingAddress,
              country_code: country.iso_2
            }
          }

          if (regionIsNew) {
            if (data.region.countries.length === 1) {
              data_.shipping_address = {
                country_code: data.region.countries[0].iso_2
              }
            }

            if (!data_.shipping_address?.country_code) {
              data_.shipping_address = null
            }
          }

          if (isDefined(updateCartData.email) && data.customer?.customer) {
            const currentCustomer = data.customer.customer!
            data_.customer_id = currentCustomer.id

            // registered customers can update the cart email
            if (currentCustomer.has_account) {
              data_.email = updateCartData.email
            } else {
              data_.email = data.customer.email
            }
          }

          if (isDefined(updateCartData.sales_channel_id)) {
            data_.sales_channel_id = data.salesChannel!.id
          }

          return data_
        }
      )

      const validate = createHook('validate', {
        input: cartInput,
        cart: cartToUpdate
      })

      // Validate delivery data before updating cart
      const validationInput = transform({ input, cartToUpdate }, ({ input, cartToUpdate }) => ({
        cart_id: input.id,
        cart: cartToUpdate,
        input: {
          shipping_address: input.shipping_address ? {
            postal_code: input.shipping_address.postal_code
          } : undefined,
          additional_data: input.additional_data
        },
        // becomes invalid after an address change or time passes. We'll clear it and proceed.
        clearInvalidDeliveryData: true
      }))

      validateCartDeliveryDataStep(validationInput)

      /*
      when({ cartInput }, ({ cartInput }) => {
        return isDefined(cartInput.customer_id) || isDefined(cartInput.email)
      }).then(() => {
        emitEventStep({
          eventName: CartWorkflowEvents.CUSTOMER_UPDATED,
          data: { id: input.id },
        }).config({ name: "emit-customer-updated" })
      })
      */

      const regionUpdated = transform(
        { input, cartToUpdate },
        ({ input, cartToUpdate }) => {
          return (
            isDefined(input.region_id) &&
            input.region_id !== cartToUpdate?.region?.id
          )
        }
      )

      when({ regionUpdated }, ({ regionUpdated }) => {
        return !!regionUpdated
      }).then(() => {
        emitEventStep({
          eventName: CartWorkflowEvents.REGION_UPDATED,
          data: { id: input.id }
        }).config({ name: 'emit-region-updated' })
      })

      parallelize(
        updateCartsStep([cartInput]),
        emitEventStep({
          eventName: CartWorkflowEvents.UPDATED,
          data: { id: input.id }
        })
      )

      // In case the region is updated, we might have a new currency OR tax inclusivity setting
      // Therefore, we need to delete line items with a custom price for good measure
      when({ regionUpdated }, ({ regionUpdated }) => {
        return !!regionUpdated
      }).then(() => {
        const lineItems = useQueryGraphStep({
          entity: 'line_items',
          filters: {
            cart_id: input.id,
            is_custom_price: true
          },
          fields: ['id']
        })

        const lineItemIds = transform(
          { queryResult: lineItems as unknown },
          ({ queryResult }) => {
            const rows = (queryResult as { data?: Array<{ id: string }> }).data
            return rows?.map((i) => i.id) ?? []
          }
        )

        deleteLineItemsStep(lineItemIds)
      })

      //@TODO refreshCartItemsWorkflow is not required here, as it is called in route already
      // const cart = refreshCartItemsWorkflow.runAsStep({
      //   input: {
      //     cart_id: cartInput.id,
      //     promo_codes: input.promo_codes,
      //     force_refresh: !!newRegion
      //   }
      // })

      // const cartUpdated = createHook('cartUpdated', {
      //   cart,
      //   additional_data: input.additional_data
      // })

      // Check if slot_id is present to determine instant vs scheduled delivery
      // slot_id must be a non-empty string to be considered slotted
      // null, undefined, or empty string = instant delivery
      const hasSlotId = transform({ input }, ({ input }) => {
        const deliveryDetail = input.additional_data?.delivery_detail as {
          delivery_type?: string
          slot_id?: string | null
        } | undefined

        if (!deliveryDetail) return false

        const slotId = deliveryDetail.slot_id
        // Consider as slotted only if slot_id is a non-empty string
        return typeof slotId === 'string' && slotId.trim().length > 0
      })

      // Handle instant delivery (no slot_id) - calculate and store delivery promise
      when({ hasSlotId, input, cartInput, cartToUpdate }, ({ hasSlotId, input, cartInput, cartToUpdate }) => {
        const deliveryDetail = input.additional_data?.delivery_detail as { delivery_type?: string } | undefined
        const hasPostalCode = !!(
          cartInput.shipping_address?.postal_code ||
          input.shipping_address?.postal_code ||
          cartToUpdate.shipping_address?.postal_code
        )
        return !!deliveryDetail && !hasSlotId && hasPostalCode
      }).then(() => {
        const deliveryInput = transform({ input, cartInput, cartToUpdate }, ({ input, cartInput, cartToUpdate }) => {
          const deliveryDetail = input.additional_data?.delivery_detail as { delivery_type: string }
          return {
            cart_id: input.id,
            postal_code: (
              cartInput.shipping_address?.postal_code ||
              input.shipping_address?.postal_code ||
              cartToUpdate.shipping_address?.postal_code
            ) as string,
            delivery_type: deliveryDetail.delivery_type
          }
        })

        updateStandardDeliveryDetailStep(deliveryInput)
      })

      // Handle scheduled delivery (with slot_id) - fetch slot from slot_override and validate
      when({ hasSlotId }, ({ hasSlotId }) => {
        return !!hasSlotId
      }).then(() => {
        const slottedInput = transform({ input }, ({ input }) => {
          const deliveryDetail = input.additional_data?.delivery_detail as {
            delivery_type: string
            slot_id: string
          }
          return {
            cart_id: input.id,
            slot_id: deliveryDetail.slot_id,
            delivery_type: deliveryDetail.delivery_type
          }
        })

        updateSlottedDeliveryDetailStep(slottedInput)
      })

      return new WorkflowResponse(void 0, {
        // hooks: [validate, cartUpdated]
        hooks: [validate]
      })
    }
  )
