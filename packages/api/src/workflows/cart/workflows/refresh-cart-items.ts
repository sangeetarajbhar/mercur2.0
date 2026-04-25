import { filterObjectByKeys } from '@medusajs/framework/utils'
import { MedusaError } from '@medusajs/framework/utils'
import {
  WorkflowData,
  WorkflowResponse,
  createHook,
  createWorkflow,
  transform,
  when
} from '@medusajs/framework/workflows-sdk'
import {
  acquireLockStep,
  refreshCartShippingMethodsWorkflow,
  releaseLockStep,
  updateCustomersStep, // refreshPaymentCollectionForCartWorkflow,
  updateLineItemsStep,
  updateTaxLinesWorkflow, // upsertTaxLinesWorkflow,
  useRemoteQueryStep,
  validateCartStep,
  validateVariantPricesStep
} from '@medusajs/medusa/core-flows'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'
import { AdditionalData } from '@medusajs/framework/types'

import { defaultGetCartFields } from '../../../api/store/carts/query-config'
import { transformCart } from '../../../api/store/v2/carts/helpers'
import { transformCartThumbnails } from '../../../api/utils/middlewares/products/transform-image-urls'
import stockLocationExtensionLink from '../../../links/stock-location-stock-location-extension'
import { LocationType } from '../../../modules/stock-location-extension/types/common'
import {
  cartFieldsForPricingContext,
  cartFieldsForRefreshSteps,
  productVariantsFields
} from '../utils/fields'
import {
  Input as PrepareLineItemDataInput,
  prepareLineItemData
} from '../utils/prepare-line-item-data'
import { pricingContextResult } from '../utils/schemas'
import { refreshCartExtraChargesTableWorkflow } from '../workflows'
import { updateCartPromotionsWorkflow } from '../workflows'
// import { refreshCartShippingMethodsWorkflow } from "./refresh-cart-shipping-methods"
import { refreshPaymentCollectionForCartWorkflow } from '../steps'
// import { updateCartPromotionsWorkflow } from "./update-cart-promotions"
// import { updateTaxLinesWorkflow } from "./update-tax-lines"
import { upsertTaxLinesWorkflow } from '../workflows'
import {
  checkPromotionActionStep,
  cleanupAutoPromotionsStep,
  fetchLocationHierarchiesStep,
  fetchStockLocationExtensionsStep,
  fetchZoneByPincodeStep,
  refetchCartWithDeliveryDetailsStep,
  removeDeviceRestrictedPromotionsStep,
  wrapVariantsWithSellerPricingStep
} from '../steps'
import { getCartPromiseStep } from '../../delivery-promise/steps'
import { CacheTTLMap, UseQueryGraphStepCacheKey, CACHE_ENABLE } from '../../../shared/utils/redisKey'

// import { confirmVariantInventoryWorkflow } from './confirm-variant-inventory'

/**
 * The details of the cart to refresh.
 */
export type RefreshCartItemsWorkflowInput = {
  /**
   * The cart's ID.
   */
  cart_id: string
  /**
   * The promotion codes applied on the cart.
   * These promotion codes will replace previously applied codes.
   */
  promo_codes?: string[]
  /**
   * Force refresh the cart items
   */
  force_refresh?: boolean

  /**
   * The items to refresh.
   */
  items?: any[]

  /**
   * The shipping methods to refresh.
   */
  shipping_methods?: any[]

  /**
   * Whether to force re-calculating tax amounts, which
   * may include sending requests to a third-part tax provider, depending
   * on the configurations of the cart's tax region.
   */
  force_tax_calculation?: boolean

  /**
   * Postal code for delivery promise calculation (optional)
   * Used only when calling from GET /v2/carts/:id
   */
  postal_code?: string

  /**
   * Latitude for delivery promise calculation (optional)
   */
  lat?: string

  /**
   * Longitude for delivery promise calculation (optional)
   */
  long?: string

  /**
   * Whether to include delivery promise calculation
   * Set to true when calling from GET /v2/carts/:id
   */
  include_delivery_promise?: boolean

  /**
   * Fields to include in the cart response
   */
  fields?: string[]

  /**
   * Resolution for thumbnail images (e.g., "2x", "3x")
   * Used for transforming image URLs with appropriate resolution
   */
  resolution?: string

  /**
   * Alternative parameter name for resolution
   */
  thumbnail_resolution?: string

  /**
   * Agent type (app or web) for device restriction validation
   * Used to filter out promotions that are not applicable on the current platform
   */
  agent_type?: 'app' | 'web'
}

export const refreshCartItemsWorkflowId = 'custom-refresh-cart-items'
/**
 * This workflow refreshes a cart to ensure its prices, promotion codes, taxes, and other details are applied correctly. It's useful
 * after making a chnge to a cart, such as after adding an item to the cart or adding a promotion code.
 *
 * This workflow is used by other cart-related workflows, such as the {@link addToCartWorkflow} after an item
 * is added to the cart.
 *
 * You can use this workflow within your own customizations or custom workflows, allowing you to refresh the cart after making updates to it in your
 * custom flows.
 *
 * @example
 * const { result } = await refreshCartItemsWorkflow(container)
 * .run({
 *   input: {
 *     cart_id: "cart_123",
 *   }
 * })
 *
 * @summary
 *
 * Refresh a cart's details after an update.
 *
 * @property hooks.setPricingContext - This hook is executed before the cart is refreshed. You can consume this hook to return any custom context useful for the prices retrieval of the variants in the cart.
 *
 * For example, assuming you have the following custom pricing rule:
 *
 * ```json
 * {
 *   "attribute": "location_id",
 *   "operator": "eq",
 *   "value": "sloc_123",
 * }
 * ```
 *
 * You can consume the `setPricingContext` hook to add the `location_id` context to the prices calculation:
 *
 * ```ts
 * import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows";
 * import { StepResponse } from "@medusajs/workflows-sdk";
 *
 * refreshCartItemsWorkflow.hooks.setPricingContext((
 *   { cart, items, additional_data }, { container }
 * ) => {
 *   return new StepResponse({
 *     location_id: "sloc_123", // Special price for in-store purchases
 *   });
 * });
 * ```
 *
 * The variants' prices will now be retrieved using the context you return.
 *
 * :::note
 *
 * Learn more about prices calculation context in the [Prices Calculation](https://docs.medusajs.com/resources/commerce-modules/pricing/price-calculation) documentation.
 *
 * :::
 *
 */
export const refreshCartItemsWorkflow = createWorkflow(
  {
    name: refreshCartItemsWorkflowId,
    idempotent: false
  },
  (input: WorkflowData<RefreshCartItemsWorkflowInput & AdditionalData>) => {
    // CRITICAL: Acquire lock EARLY to prevent race conditions with updateCartPromotionsWorkflow
    // This ensures only one cart operation happens at a time
    // Lock is released at the end of the workflow to prevent deadlocks
    // Increased timeout to 5 seconds to handle concurrent requests from frontend
    acquireLockStep({
      key: input.cart_id,
      timeout: 5,
      ttl: 15
    })

    const setPricingContext = createHook(
      'setPricingContext',
      {
        cart_id: input.cart_id,
        items: input.items,
        additional_data: input.additional_data
      },
      {
        resultValidator: pricingContextResult
      }
    )
    const setPricingContextResult = setPricingContext.getResult()


    const cartIdCacheKey = transform({ input }, ({ input }) => {
      return `${UseQueryGraphStepCacheKey.CHECK_CART_POSTAL_CODE}${input.cart_id}`
    })
    const ttl = CacheTTLMap[UseQueryGraphStepCacheKey.CHECK_CART_POSTAL_CODE]

    // Extract cart data for postal code and customer info
    const cartForPostalCode = useQueryGraphStep({
      entity: 'cart',
      fields: ['id', 'shipping_address.postal_code', 'shipping_address.first_name', 'shipping_address.last_name', 'customer_id'],
      filters: { id: input.cart_id },
      options: {
        cache: {
          enable: CACHE_ENABLE,
          ttl: ttl,
          key: cartIdCacheKey
        },
      },
      }).config({ name: 'get-cart-for-postal-code' })


    // 2. Extract customer_id
    const customer_id = transform(
      { cartForPostalCode },
      ({ cartForPostalCode }) => {
        return cartForPostalCode?.data?.[0]?.customer_id || null
      }
    )

    // 3. Conditionally fetch customer
    const customerQuery = when(
      'fetch-customer-details',
      { customer_id },
      ({ customer_id }) => !!customer_id
    ).then(() => {
      const customerIdCacheKey = transform({ customer_id }, ({ customer_id }) => {
        return `${UseQueryGraphStepCacheKey.GET_CUSTOMER_NAME}${customer_id}`
      })
      const ttl = CacheTTLMap[UseQueryGraphStepCacheKey.GET_CUSTOMER_NAME]

      return useQueryGraphStep({
        entity: 'customer',
        fields: ['id', 'first_name', 'last_name'],
        filters: { id: customer_id },
        options: {
          cache: {
            enable: CACHE_ENABLE,
            ttl: ttl,
            key: customerIdCacheKey
          },
        },
      }).config({ name: 'get-customer-details' })
    })

    const updatePayload = transform(
      { customerQuery, cartForPostalCode },
      ({ customerQuery, cartForPostalCode }) => {
        const customer = customerQuery?.data?.[0]

        // if user is not login, then also item can add in a cart
        if (!customer) {
          return null
        }

        // Customer already has name, no update needed
        if (customer.first_name || customer.last_name) {
          return null
        }

        const sanitize = (v?: string | null) =>
          v && v.trim().length > 0 ? v.trim() : null

        const cartShipping =
          cartForPostalCode?.data?.[0]?.shipping_address || {} as any

        const updatedFirst = sanitize(cartShipping.first_name)
        const updatedLast = sanitize(cartShipping.last_name)

        // No name available, skip
        if (!updatedFirst && !updatedLast) {
          return null
        }

        if (!customer.id) {
          return null
        }

        return {
          selector: {
            id: customer.id
          },
          update: {
            first_name: updatedFirst,
            last_name: updatedLast
          }
        }
      }
    )

    //Conditionally run updateCustomersStep
    when(
      'update-customer-name-if-needed',
      { updatePayload },
      ({ updatePayload }) => !!updatePayload
    ).then(() => {
      // update first_name, last_name only if in customer table first_name, last_name is null or empty
      return updateCustomersStep(updatePayload as any)
    })

    // Extract postal_code from input, fallback to shipping address postcode
    const postal_code = transform(
      { input, cartForPostalCode },
      ({ input, cartForPostalCode }) => {
        return (
          input.postal_code ||
          cartForPostalCode?.data?.[0]?.shipping_address?.postal_code
        )
      }
    )

    // Fetch zone by pincode conditionally
    const zoneResult = when(
      'fetch-zone-by-pincode',
      { postal_code },
      ({ postal_code }) => {
        return !!postal_code
      }
    ).then(() => {
      return fetchZoneByPincodeStep({ postal_code })
    })

    // Extract zone from result (handle undefined when condition is false)
    const zone = transform({ zoneResult }, ({ zoneResult }) => {
      return zoneResult || null
    })

    // Extract cluster_id from zone
    const cluster_id = transform({ zone }, ({ zone }) => {
      return zone?.location_id || null
    })

    // Step 1: Get location extensions for the cluster
    const locationExtensionsQuery = when(
      'get-location-extensions',
      { cluster_id },
      ({ cluster_id }) => {
        return !!cluster_id
      }
    ).then(() => {
      return fetchStockLocationExtensionsStep({
        stock_location_id: cluster_id as string
      })
     
    })

    // Step 2: Filter for dark store and validate
    const darkStoreData = transform(
      { locationExtensionsQuery, cluster_id },
      ({ locationExtensionsQuery, cluster_id }) => {
        if (!cluster_id) {
          return null
        }

        const locationExtensions = locationExtensionsQuery?.data || []

        // Filter for dark store (location_type = '1')
        const darkStoreExtensions = locationExtensions.filter(
          (ext: any) =>
            ext.stock_location_extension?.location_type ===
            LocationType.DARK_STORE.toString()
        )

        if (!darkStoreExtensions.length) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Cluster Location is not a valid dark store`
          )
        }

        // stock location extension data will have only one record against each stock location
        const darkStoreLocationId = darkStoreExtensions[0].stock_location_id

        return { darkStoreLocationId }
      }
    )

    // Step 3: Get location hierarchies for the dark store
    const locationHierarchiesQuery = when(
      'get-location-hierarchies',
      { darkStoreData },
      ({ darkStoreData }) => {
        return !!darkStoreData?.darkStoreLocationId
      }
    ).then(() => {
      const darkStoreId = darkStoreData.darkStoreLocationId
      return fetchLocationHierarchiesStep({
        parent_location_id: darkStoreId
      })
    })

    // Step 4: Combine dark store + omni store locations
    const darkStoreWithChildrenStockLocation = transform(
      { darkStoreData, locationHierarchiesQuery },
      ({ darkStoreData, locationHierarchiesQuery }) => {
        if (!darkStoreData?.darkStoreLocationId) {
          return []
        }

        const locationHierarchies = locationHierarchiesQuery?.data || []
        const childLocations = locationHierarchies.map(
          (loc: any) => loc.child_location_id
        )

        // Combine dark store + omni store cluster_id in one array
        return [darkStoreData.darkStoreLocationId, ...childLocations]
      }
    )

    // when({ input }, ({ input }) => {
    when('check-force-refresh', { input }, ({ input }) => {
      return !!input.force_refresh
    }).then(() => {
      const { data: cart } = useQueryGraphStep({
        entity: 'cart',
        fields: cartFieldsForRefreshSteps,
        filters: { id: input.cart_id },
        options: { isList: false }
      }).config({ name: 'fetch-cart-for-force-refresh' })

      // CRITICAL: Validate cart before processing
      validateCartStep({ cart })

      const variantIds = transform({ cart }, ({ cart }) => {
        return (cart.items ?? []).map((i) => i.variant_id).filter(Boolean)
      })

      // Extract seller information from cart items
      const cartItemSellerMapping = transform({ cart }, ({ cart }) => {
        // const mapping = new Map()
        const mapping: Record<string, string> = {}
        cart.items?.forEach((item) => {
          const sellerId = item.metadata?.seller_id || item.seller?.id
          if (sellerId) {
            // mapping.set(item.variant_id, sellerId)
            mapping[item.variant_id] = sellerId
          }
        })
        return mapping
      })

      const cartPricingContext = transform(
        { cart, setPricingContextResult },
        ({ cart, setPricingContextResult }) => {
          return {
            ...filterObjectByKeys(cart, cartFieldsForPricingContext),
            ...(setPricingContextResult ? setPricingContextResult : {}),
            currency_code: cart.currency_code,
            region_id: cart.region_id,
            region: cart.region,
            customer_id: cart.customer_id,
            customer: cart.customer
          }
        }
      )

      // Note: Variants query with calculated_price context still uses useQueryGraphStep
      // but calculated_price requires special handling via remote query
      // Keeping useRemoteQueryStep for variants as it supports calculated_price context
      const variants = useRemoteQueryStep({
        entry_point: 'variants',
        fields: productVariantsFields,
        variables: {
          id: variantIds,
          calculated_price: {
            context: cartPricingContext
          }
        }
      }).config({ name: 'fetch-variants' })

      const wrapVariantPrices = wrapVariantsWithSellerPricingStep({
        priceContext: cartPricingContext,
        variants: variants,
        extraData: {
          location_ids: darkStoreWithChildrenStockLocation,
          filterToSingleSeller: false,
          seller_id: undefined
        }
      })

      const variantsWithPrices: any = transform(
        { wrapVariantPrices },
        ({ wrapVariantPrices }) => {
          return wrapVariantPrices
        }
      )

      validateVariantPricesStep({ variants: variantsWithPrices })

      // const lineItems = transform({ cart, variants:variantsWithPrices }, ({ cart, variants }) => {
      //   const items = cart.items.map((item) => {
      //     const variant = (variants ?? []).find(
      //       (v) => v.id === item.variant_id
      //     )

      const lineItems = transform(
        { cart, variants: variantsWithPrices, cartItemSellerMapping },
        ({ cart, variants, cartItemSellerMapping }) => {
          const items = cart.items
            .map((item) => {
              const variant = (variants ?? []).find(
                (v) => v.id === item.variant_id
              )

              // Skip items without valid variants
              if (!variant) {
                console.warn(
                  `Variant not found for item ${item.id} with variant_id ${item.variant_id}`
                )
                return null
              }
              // const input: PrepareLineItemDataInput = {
              //   item,
              //   variant: variant,
              //   cartId: cart.id,
              //   unitPrice: item.unit_price,
              //   isTaxInclusive: item.is_tax_inclusive
              // }
              // Get seller ID for this item
              // const sellerId = item.metadata?.seller_id || item.seller?.id || cartItemSellerMapping.get(item.variant_id)
              const sellerId =
                item.metadata?.seller_id ||
                item.seller?.id ||
                cartItemSellerMapping?.[item.variant_id]

              // Get seller-specific pricing if available
              let sellerPrice: any = null
              if (
                sellerId &&
                variant.calculated_price?.seller_prices?.[sellerId]
              ) {
                sellerPrice = variant.calculated_price.seller_prices[sellerId]
                // console.log(`Using seller-specific price for item ${item.id}, seller ${sellerId}:`, sellerPrice)
              }

              const input: PrepareLineItemDataInput = {
                item: {
                  ...item,
                  seller: sellerId ? { id: sellerId } : undefined
                },
                variant: variant,
                cartId: cart.id,
                unitPrice: item.unit_price,
                isTaxInclusive: item.is_tax_inclusive
              }

              // if (!item.is_custom_price) {
              //   input.unitPrice = variant.calculated_price?.calculated_amount
              //   input.isTaxInclusive =
              //     variant.calculated_price?.is_calculated_price_tax_inclusive
              // }

              if (!item.is_custom_price) {
                // Use seller-specific price if available, otherwise fall back to default
                if (
                  sellerPrice &&
                  sellerPrice.calculated_amount !== undefined
                ) {
                  input.unitPrice = sellerPrice.calculated_amount
                  input.isTaxInclusive =
                    sellerPrice.is_calculated_price_tax_inclusive || false
                } else {
                  input.unitPrice = variant.calculated_price?.calculated_amount
                  input.isTaxInclusive =
                    variant.calculated_price
                      ?.is_calculated_price_tax_inclusive || false
                }
              }

              const preparedItem = prepareLineItemData(input)

              return {
                selector: { id: item.id },
                data: preparedItem
              }
            })
            .filter(Boolean)

          return items
        }
      )

      updateLineItemsStep({
        id: cart.id,
        items: lineItems
      })
    })

    const { data: refetchedCart } = useQueryGraphStep({
      entity: 'cart',
      fields: cartFieldsForRefreshSteps,
      filters: { id: input.cart_id },
      options: { isList: false }
    }).config({ name: 'refetch-cart' })

    // Extract agent_type from input for device restriction check
    const agentType = transform({ input }, ({ input }) => input.agent_type)

    // Remove any promotions that are restricted to a different device (app vs web).
    // Same pattern as cleanupAutoPromotionsStep — soft-delete from DB so they're
    // excluded from cartPromoCodes and not re-applied by updateCartPromotionsWorkflow.
    const deviceRestrictedResult = removeDeviceRestrictedPromotionsStep({
      cart_id: input.cart_id,
      agent_type: agentType
    })

    const refreshCartInput = transform(
      { refetchedCart, input },
      ({ refetchedCart, input }) => {
        return {
          cart: !input.force_refresh ? refetchedCart : undefined,
          cart_id: input.force_refresh ? input.cart_id : undefined
        }
      }
    )

    refreshCartShippingMethodsWorkflow.runAsStep({
      input: refreshCartInput
    })

    // when({ input }, ({ input }) => {
    when('check-force-refresh-for-tax', { input }, ({ input }) => {
      return !!input.force_refresh
    }).then(() => {
      updateTaxLinesWorkflow.runAsStep({
        input: refreshCartInput
      })
    })

    // when({ input }, ({ input }) => {
    when('check-upsert-tax-lines', { input }, ({ input }) => {
      return (
        !input.force_refresh &&
        // (!!input.items?.length || !!input.shipping_methods?.length)
        (Boolean(input.items?.length) ||
          Boolean(input.shipping_methods?.length))
      )
    }).then(() => {
      upsertTaxLinesWorkflow.runAsStep({
        input: transform(
          { refetchedCart, input },
          ({ refetchedCart, input }) => {
            return {
              cart: refetchedCart,
              items: input.items ?? [],
              shipping_methods: input.shipping_methods ?? [],
              force_tax_calculation: input.force_tax_calculation
            }
          }
        )
      })
    })

    // Reapply existing promotions after cart items are refreshed
    // This ensures promotions are recalculated with updated prices/quantities
    const cartPromoCodes = transform(
      { refetchedCart, input, deviceRestrictedResult },
      ({ refetchedCart, input, deviceRestrictedResult }) => {
        // Get existing promotion codes and combine with input promo codes
        const existingPromotions = refetchedCart.promotions || []
        const removedCodes = deviceRestrictedResult?.removedCodes || []
        const existingCodes = existingPromotions
          .map((p: any) => p?.code)
          .filter(Boolean)
          .filter((code: string) => !removedCodes.includes(code))  // Filter out device-restricted codes

        // Combine existing codes with input promo codes
        const allCodes = [...new Set([...existingCodes, ...(input.promo_codes || [])])]

        return allCodes
      }
    )

    // Simple check: refresh promotions if there are any promotion codes to apply
    // Promotions depend on cart items/prices, so recalculation is needed when cart refreshes
    const needsPromotionRefresh = transform(
      { cartPromoCodes },
      ({ cartPromoCodes }) => {
        return cartPromoCodes && cartPromoCodes.length > 0
      }
    )

    // Check if any promotion has override_existing flag
    const promotionAction = checkPromotionActionStep({
      promo_codes: cartPromoCodes
    })

    // Only call updateCartPromotionsWorkflow if promotions need to be refreshed
    when({ needsPromotionRefresh }, ({ needsPromotionRefresh }) => {
      return needsPromotionRefresh === true
    }).then(() => {
      updateCartPromotionsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          cart: refetchedCart, // Pass cart to avoid refetch in updateCartPromotionsWorkflow
          promo_codes: cartPromoCodes,
          action: promotionAction, // Dynamic: ADD or REPLACE based on override_existing
          // During cart refresh, if a previously-applied promotion becomes invalid/expired,
          // silently remove it instead of failing the whole refresh.
          silent_remove: true,
          force_refresh_payment_collection: false,
        }
      })

      /**
       * Defensive cleanup: if both manual + automatic promotions exist, remove the automatic ones.
       * This prevents auto promotions from showing up in GET /store/v2/carts/:id after a user removes/rejects an auto promo.
       */
      cleanupAutoPromotionsStep({ cart_id: input.cart_id })
    })


    const beforeRefreshingPaymentCollection = createHook(
      'beforeRefreshingPaymentCollection',
      { input }
    )

    // If promotions are refreshed, updateCartPromotionsWorkflow already refreshes payment collection.
    // Run direct payment-collection refresh only when promotions are not refreshed.
    when({ needsPromotionRefresh }, ({ needsPromotionRefresh }) => {
      return !needsPromotionRefresh
    }).then(() => {
      // OPTIMIZATION: Pass cart to avoid unnecessary refetch in refreshPaymentCollectionForCartWorkflow
      refreshPaymentCollectionForCartWorkflow.runAsStep({
        input: { cart: refetchedCart }
      })
    })

    // ALWAYS fetch cart with delivery details
    const cartWithDetails = refetchCartWithDeliveryDetailsStep({
      cart_id: input.cart_id,
      fields: input.fields || defaultGetCartFields
    })

    // Conditionally calculate delivery promise
    // This is only executed when include_delivery_promise is true (GET /v2/carts/:id)
    const deliveryPromiseResult = when(
      'check-include-delivery-promise',
      { input },
      ({ input }) => {
        return !!input.include_delivery_promise
      }
    ).then(() => {
      // Calculate delivery promise
      return getCartPromiseStep({
        cart: cartWithDetails,
        postal_code: input.postal_code,
        lat: input.lat,
        long: input.long
      })
    })

    // Combine cart with delivery details and optional delivery promise
    const finalCart = transform(
      { cartWithDetails, deliveryPromiseResult, input },
      ({ cartWithDetails, deliveryPromiseResult, input }) => {
        // Always include delivery_details, optionally include deliveryPromiseResult
        if (input.include_delivery_promise && deliveryPromiseResult) {
          return {
            ...cartWithDetails,
            deliveryPromiseResult
          }
        }
        return cartWithDetails
      }
    )

    // CRITICAL: Release lock BEFORE returning
    // This prevents the lock from being held after the workflow completes
    // releaseLockStep({
    //   key: input.cart_id
    // })

    // Refresh extra charges and get updated cart with extra charges
    const extraChargesResult = refreshCartExtraChargesTableWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        fields: input.fields
      }
    })

    // Get the updated cart with extra charges from the extra charges workflow
    const cartWithExtraCharges = transform(
      { finalCart, extraChargesResult },
      ({ finalCart, extraChargesResult }) => {
        // If extra charges workflow returned a cart, use it; otherwise use finalCart
        if (extraChargesResult?.cart) {
          return {
            ...extraChargesResult.cart,
            // Preserve delivery promise data and delivery details if they exist
            deliveryPromiseResult: finalCart.deliveryPromiseResult,
            delivery_details: finalCart.delivery_details
          }
        }
        // If no extra charges result, return finalCart with empty extra charges
        return {
          ...finalCart,
          extra_charges: [],
          extra_charge_total: 0
        }
      }
    )

    // CRITICAL: Release lock AFTER extra charges refresh to prevent duplicate extra charges
    releaseLockStep({
      key: input.cart_id
    })

    // Transform cart to add serviceability flags to items
    // This runs at workflow execution time, not definition time
    const finalCartWithFlags = transform(
      { cartWithExtraCharges, input },
      ({ cartWithExtraCharges, input }) => {
        const cartWithFlags = transformCart(cartWithExtraCharges)

        // Transform cart thumbnails to include base URL with resolution
        // Create a mock request object with the resolution from input
        const mockReq = {
          query: {
            resolution: input.resolution || input.thumbnail_resolution || "3x"
          }
        }
        transformCartThumbnails(cartWithFlags, mockReq as any)

        return cartWithFlags
      }
    )

    return new WorkflowResponse(finalCartWithFlags, {
      hooks: [setPricingContext, beforeRefreshingPaymentCollection] as const
    })

    // return new WorkflowResponse(finalCart, {
    //   hooks: [setPricingContext, beforeRefreshingPaymentCollection] as const
    // })
  }
)
