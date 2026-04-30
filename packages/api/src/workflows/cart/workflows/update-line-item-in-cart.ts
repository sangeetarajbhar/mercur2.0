import {
  AdditionalData,
  UpdateLineItemInCartWorkflowInputDTO
} from '@medusajs/framework/types'
import {
  CartWorkflowEvents,
  MedusaError,
  deduplicate,
  isDefined
} from '@medusajs/framework/utils'
import {
  WorkflowData,
  WorkflowResponse,
  createHook,
  createWorkflow,
  transform,
  when
} from '@medusajs/framework/workflows-sdk'
import {
  emitEventStep,
  updateLineItemsStepWithSelector,
  useQueryGraphStep,
  useRemoteQueryStep,
  validateCartStep,
  validateVariantPricesStep
} from '@medusajs/medusa/core-flows'
import { confirmVariantInventoryWorkflow } from './confirm-variant-inventory'
import { wrapVariantsWithSellerPricingStep } from '../steps/wrap-variants-with-seller-pricing'
// import { validateSellerInventoryStep } from '../steps/validate-seller-inventory'
import {
  cartFieldsForPricingContext,
  productVariantsFields
} from '../utils/fields'
import { requiredVariantFieldsForInventoryConfirmation } from '../utils/prepare-confirm-inventory-input'
import { pricingContextResult } from '../utils/schemas'
import { refreshCartItemsWorkflow } from './refresh-cart-items'
import sellerSellerCartLineItemLink from '../../../links/seller-cart-line-item'
import stockLocationExtensionLink from '../../../links/stock-location-stock-location-extension'
import { LocationType } from '../../../modules/stock-location-extension/types/common'

const cartFields = cartFieldsForPricingContext.concat([
  'items.*',
  'items.metadata.*',
  'items.variant.id',

])

export const updateLineItemInCartWorkflowId = 'custom-update-line-item-in-cart'
/**
 * This workflow updates a line item's details in a cart. You can update the line item's quantity, unit price, and more. This workflow is executed
 * by the [Update Line Item Store API Route](https://docs.medusajs.com/api/store#carts_postcartsidlineitemsline_id).
 *
 * You can use this workflow within your own customizations or custom workflows, allowing you to update a line item's details in your custom flows.
 *
 * @example
 * const { result } = await updateLineItemInCartWorkflow(container)
 * .run({
 *   input: {
 *     cart_id: "cart_123",
 *     item_id: "item_123",
 *     update: {
 *       quantity: 2
 *     }
 *   }
 * })
 *
 * @summary
 *
 * Update a cart's line item.
 *
 * @property hooks.validate - This hook is executed before all operations. You can consume this hook to perform any custom validation. If validation fails, you can throw an error to stop the workflow execution.
 * @property hooks.setPricingContext - This hook is executed before the cart is updated. You can consume this hook to return any custom context useful for the prices retrieval of the line item's variant.
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
 * import { addToCartWorkflow } from "@medusajs/medusa/core-flows";
 * import { StepResponse } from "@medusajs/workflows-sdk";
 *
 * addToCartWorkflow.hooks.setPricingContext((
 *   { cart, variantIds, items, additional_data }, { container }
 * ) => {
 *   return new StepResponse({
 *     location_id: "sloc_123", // Special price for in-store purchases
 *   });
 * });
 * ```
 *
 * The variant's prices will now be retrieved using the context you return.
 *
 * :::note
 *
 * Learn more about prices calculation context in the [Prices Calculation](https://docs.medusajs.com/resources/commerce-modules/pricing/price-calculation) documentation.
 *
 * :::
 */


export const updateLineItemInCartWorkflow = createWorkflow(
  updateLineItemInCartWorkflowId,
  (
    input: WorkflowData<UpdateLineItemInCartWorkflowInputDTO & AdditionalData & { fields?: string[] }>
    ) => {
      // Merge input fields with required fields for pricing context
      // Only add minimal fields needed for pricing (currency_code, region_id)
      // Don't add region.* fields to avoid including region data in response
      const fieldsToUse = transform({ input }, ({ input }) => {
        const baseFields = input.fields || cartFields
        const requiredFields = [
          'currency_code',
          'region_id',
        ]

        // Combine and deduplicate fields
        return [...new Set([...baseFields, ...requiredFields])]
      })

      const cartQuery = useQueryGraphStep({
        entity: 'cart',
        filters: { id: input.cart_id },
        fields: fieldsToUse,
        options: { throwIfKeyNotFound: true }
      }).config({ name: 'get-cart' })

    const cart = transform({ cartQuery: cartQuery as any }, ({ cartQuery}) => cartQuery.data[0])
    const item = transform({ cart, input }, ({ cart, input }) => {
      return cart.items.find((i) => i?.id === input.item_id)
    })

    // Query the seller from the link table using useQueryGraphStep
    const sellerLinkQuery = useQueryGraphStep({
      entity: sellerSellerCartLineItemLink.entryPoint,
      fields: ['seller_id', 'line_item_id'],
      filters: { line_item_id: input.item_id },
      options: { throwIfKeyNotFound: false }
    }).config({ name: 'get-line-item-seller' })

    const sellerId = transform({ sellerLinkQuery }, ({ sellerLinkQuery }) => {
      const linkData = sellerLinkQuery.data[0]
      // console.log("Seller link query result:", linkData)
      return linkData?.seller_id || null
    })

    validateCartStep({ cart: cart as any })

    const validate = createHook('validate', {
      input,
      cart
    })

    const variantIds = transform({ item }, ({ item }) => {
      return [item?.variant_id].filter(Boolean)
    })

    const setPricingContext = createHook(
      'setPricingContext',
      {
        cart,
        item,
        variantIds,
        additional_data: input.additional_data
      },
      {
        resultValidator: pricingContextResult
      }
    )

    const setPricingContextResult = setPricingContext.getResult()
    const pricingContext = transform(
      { cart, setPricingContextResult },
      (data) => {
        return {
          ...data.cart,
          ...(data.setPricingContextResult ? data.setPricingContextResult : {}),
          currency_code: data.cart.currency_code,
          region_id: data.cart.region_id,
          region: data.cart.region,
          customer_id: data.cart.customer_id,
          customer: data.cart.customer
        }
      }
    )

    const variants = when({ variantIds }, ({ variantIds }) => {
      return !!variantIds.length
    }).then(() => {
      return useRemoteQueryStep({
        entry_point: 'variants',
        fields: deduplicate([
          ...productVariantsFields,
          ...requiredVariantFieldsForInventoryConfirmation
        ]),
        variables: {
          id: variantIds,
          calculated_price: {
            context: pricingContext
          }
        }
      }).config({ name: 'fetch-variants' })
    })

    const cluster_id = transform({ input }, ({ input }) => {
      return input.update?.metadata?.cluster_id
    })

    // Step 1: Get location extensions for the cluster
    const locationExtensionsQuery = when({ cluster_id }, ({ cluster_id }) => {
      return !!cluster_id
    }).then(() => {
      return useQueryGraphStep({
        entity: stockLocationExtensionLink.entryPoint,
        fields: [
          'stock_location_id',
          'stock_location_extension.location_type',
          'stock_location_extension.id'
        ],
        filters: {
          stock_location_id: cluster_id
        }
      }).config({ name: "get-location-extensions" })
    })

    // Step 2: Filter for dark store and validate
    const darkStoreData = transform({ locationExtensionsQuery, cluster_id }, ({ locationExtensionsQuery, cluster_id }) => {
      if (!cluster_id) {
        return null
      }

      const locationExtensions = locationExtensionsQuery?.data || []

      // Filter for dark store (location_type = '1')
      const darkStoreExtensions = locationExtensions.filter(
        (ext: any) => ext.stock_location_extension?.location_type === LocationType.DARK_STORE.toString()
      )

      if (!darkStoreExtensions.length) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Cluster Location is not a valid dark store`)
      }

      // stock location extension data will have only one record against each stock location
      const darkStoreLocationId = darkStoreExtensions[0].stock_location_id

      return { darkStoreLocationId }
    })

    // Step 3: Get location hierarchies for the dark store
    const locationHierarchiesQuery = when({ darkStoreData }, ({ darkStoreData }) => {
      return !!darkStoreData?.darkStoreLocationId
    }).then(() => {
      return useQueryGraphStep({
        entity: 'location_hierarchy',
        fields: ['parent_location_id', 'child_location_id'],
        filters: { parent_location_id: darkStoreData.darkStoreLocationId }
      }).config({ name: "get-location-hierarchies" })
    })

    // Step 4: Combine dark store + omni store locations
    const darkStoreWithChildrenStockLocation = transform(
      { darkStoreData, locationHierarchiesQuery },
      ({ darkStoreData, locationHierarchiesQuery }) => {
        if (!darkStoreData?.darkStoreLocationId) {
          return []
        }

        const locationHierarchies = locationHierarchiesQuery?.data || []
        const childLocations = locationHierarchies.map((loc: any) => loc.child_location_id)

        // Combine dark store + omni store cluster_id in one array
        return [darkStoreData.darkStoreLocationId, ...childLocations]
      }
    )

    const wrapVariantPrices = wrapVariantsWithSellerPricingStep({
      priceContext: pricingContext,
      variants: variants,
      extraData: { location_ids: darkStoreWithChildrenStockLocation, filterToSingleSeller: false, seller_id: undefined }
    })
    const variantsWithPrices: any = transform(
      { wrapVariantPrices },
      ({ wrapVariantPrices }) => {
        return wrapVariantPrices
      }
    )

    validateVariantPricesStep({ variants: variantsWithPrices })

    // Validate seller inventory before updating line item
    // const inventoryValidationInput = transform({ input, item, cart }, (data) => {
    //   return {
    //     items: [{
    //       variant_id: data.item.variant_id,
    //       quantity: data.input.update.quantity || data.item.quantity,
    //       seller_id: data.item.seller_id || data.item.metadata?.seller_id
    //     }],
    //     location_ids: data.cart.metadata?.location_ids || []
    //   }
    // })

    // validateSellerInventoryStep(inventoryValidationInput)

    const items = transform({ input, item, sellerId }, (data) => {
      const mergedMetadata = {
        ...(data?.item?.metadata || {}),
        ...(data?.input?.update?.metadata || {})
      }

      // Validate that cluster_id is provided when updating line item
      if (!mergedMetadata.cluster_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `cluster_id is required in metadata when updating line item`
        )
      }

      // Ensure seller_id is present for cluster validation; prefer existing metadata, fallback to link
      if (!mergedMetadata.seller_id && data.sellerId) {
        mergedMetadata.seller_id = data.sellerId
      }

      const updatedItem = Object.assign({}, data.item, {
        quantity: data.input.update.quantity ?? data?.item?.quantity,
        metadata: mergedMetadata
      })

      return [updatedItem]
    })

    confirmVariantInventoryWorkflow.runAsStep({
      input: {
        sales_channel_id: cart.sales_channel_id as string,
        variants: variantsWithPrices,
        items
      }
    })

    const lineItemUpdate = transform(
      { input, variants: variantsWithPrices, item, sellerId },
      (data) => {
        const variant = data.variants?.[0] ?? undefined
        const item = data.item
        // const sellerId = item.seller?.id
        const sellerId = data.sellerId
        // console.log("Seller ID from link table:", sellerId);
        const updateData = {
          ...data.input.update,
          unit_price: isDefined(data.input.update.unit_price)
            ? data.input.update.unit_price
            : item?.unit_price,
          is_custom_price: isDefined(data.input.update.unit_price)
            ? true
            : item?.is_custom_price,
          is_tax_inclusive:
            item?.is_tax_inclusive ||
            variant?.calculated_price?.is_calculated_price_tax_inclusive
        }

        // if (!isDefined(variant.calculated_price?.seller_prices[sellerId]?.calculated_amount)) {
        //   throw new MedusaError(
        //     MedusaError.Types.INVALID_DATA,
        //     `Line item ${item.title} has no seller-specific unit price`
        //   )
        // }

        // IMPORTANT: Don't recalculate unit_price if only quantity is being updated and custom price is not provided
        // This preserves existing effective pricing when promotions are applied
        const isQuantityOnlyUpdate = data.input.update.quantity !== undefined &&
                                   !isDefined(data.input.update.unit_price) &&
                                   Object.keys(data.input.update).length === 1;

        if (!isQuantityOnlyUpdate && !data.input.update.unit_price) {
          // Only recalculate unit_price for non-quantity-only updates
          if (
            sellerId &&
            variant?.calculated_price?.seller_prices &&
            typeof variant.calculated_price.seller_prices == 'object' &&
            variant.calculated_price.seller_prices[sellerId]
          ) {
            updateData.unit_price =
              variant.calculated_price.seller_prices[sellerId].calculated_amount

          } else {
            updateData.unit_price = variant.calculated_price.calculated_amount

          }
        }
        // else {
        // }

        // if (variant && !updateData.is_custom_price) {
        //   updateData.unit_price = variant.calculated_price.calculated_amount
        // }

        if (!isDefined(updateData.unit_price)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Line item ${item?.title} has no unit price`
          )
        }

        return {
          data: updateData,
          selector: {
            id: data.input.item_id
          }
        }
      }
    )

    updateLineItemsStepWithSelector(lineItemUpdate)

      const refreshCartData = refreshCartItemsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          postal_code: cart?.shipping_address?.postal_code as string,
          fields: fieldsToUse,
          include_delivery_promise: true,
          resolution: input.additional_data?.resolution as string | undefined,
          thumbnail_resolution: input.additional_data?.thumbnail_resolution as string | undefined
        }
      })

    emitEventStep({
      eventName: CartWorkflowEvents.UPDATED,
      data: { id: input?.cart_id }
    })

    return new WorkflowResponse(refreshCartData, {
      hooks: [validate, setPricingContext] as const
    })
  }
)
