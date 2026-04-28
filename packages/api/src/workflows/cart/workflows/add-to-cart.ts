import {
  AdditionalData,
  AddToCartWorkflowInputDTO,
  ConfirmVariantInventoryWorkflowInputDTO,
} from "@medusajs/framework/types"
import {
  CartWorkflowEvents,
  deduplicate,
  isDefined,
  // MedusaError,
} from "@medusajs/framework/utils"
import {
  createHook,
  createWorkflow,
  parallelize,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { useRemoteQueryStep } from "@medusajs/medusa/core-flows"
import { ExtendedLineItem } from "../utils/extend-dto"
import { createLineItemsStep } from "../steps"
import {
  updateLineItemsStep,
} from "@medusajs/medusa/core-flows"
import { getSellerLineItemActionsStep } from "../steps"
import { validateCartStep } from "@medusajs/medusa/core-flows"
import { validateLineItemPricesStep } from "@medusajs/medusa/core-flows"
import { validateVariantPricesStep } from "@medusajs/medusa/core-flows"
import {
  cartFieldsForPricingContext,
  productVariantsFields,
} from "../utils"
import { requiredVariantFieldsForInventoryConfirmation } from "../utils"
import {
  prepareLineItemData,
  Input
} from "../utils"
import { pricingContextResult } from "../utils"
import { confirmVariantInventoryWorkflow } from "../workflows"
import { refreshCartItemsWorkflow } from '../../cart/workflows'
import { wrapVariantsWithSellerPricingStep } from "../steps"
import { fetchStockLocationExtensionsStep } from "../steps"
import { fetchLocationHierarchiesStep } from "../steps"
import { MedusaError } from "@medusajs/framework/utils"
import { LocationType } from "../../../modules/stock-location-extension/types/common"

const cartFields = ["completed_at"].concat(cartFieldsForPricingContext)

export const addToCartWorkflowId = "add-to-cart-v2"
/**
 * This workflow adds a product variant to a cart as a line item. It's executed by the
 * [Add Line Item Store API Route](https://docs.medusajs.com/api/store#carts_postcartsidlineitems).
 *
 * You can use this workflow within your own customizations or custom workflows, allowing you to wrap custom logic around adding an item to the cart.
 * For example, you can use this workflow to add a line item to the cart with a custom price.
 *
 * @example
 * const { result } = await addToCartWorkflow(container)
 * .run({
 *   input: {
 *     cart_id: "cart_123",
 *     items: [
 *       {
 *         variant_id: "variant_123",
 *         quantity: 1,
 *       },
 *       {
 *         variant_id: "variant_456",
 *         quantity: 1,
 *         unit_price: 20
 *       }
 *     ]
 *   }
 * })
 *
 * @summary
 *
 * Add a line item to a cart.
 *
 * @property hooks.validate - This hook is executed before all operations. You can consume this hook to perform any custom validation. If validation fails, you can throw an error to stop the workflow execution.
 * @property hooks.setPricingContext - This hook is executed after the cart is retrieved and before the line items are created. You can consume this hook to return any custom context useful for the prices retrieval of the variants to be added to the cart.
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
 * The variants' prices will now be retrieved using the context you return.
 *
 * :::note
 *
 * Learn more about prices calculation context in the [Prices Calculation](https://docs.medusajs.com/resources/commerce-modules/pricing/price-calculation) documentation.
 *
 * :::
 */
export const addToCartWorkflow = createWorkflow({
  name: addToCartWorkflowId,
  store: true,
  retentionTime: 99999
},
  (input: WorkflowData<AddToCartWorkflowInputDTO & AdditionalData & { fields?: string[] }>) => {
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
      entity: "cart",
      filters: { id: input.cart_id },
      fields: fieldsToUse,
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-cart" })

    const cart = transform({ cartQuery: cartQuery as any }, ({ cartQuery }) => {
      return cartQuery.data[0]
    })

    validateCartStep({ cart })
    const validate = createHook("validate", {
      input,
      cart,
    })

    const variantIds = transform({ input }, (data) => {
      return (data.input.items ?? []).map((i) => i.variant_id).filter(Boolean)
    })

    const setPricingContext = createHook(
      "setPricingContext",
      {
        cart,
        variantIds,
        items: input.items,
        additional_data: input.additional_data,
      },
      {
        resultValidator: pricingContextResult,
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
          customer: data.cart.customer,
        }
      }
    )

    const variants = when({ variantIds }, ({ variantIds }) => {
      return !!variantIds.length
    }).then(() => {
      return useRemoteQueryStep({
        entry_point: "variants",
        fields: deduplicate([
          ...productVariantsFields,
          ...requiredVariantFieldsForInventoryConfirmation,
        ]),
        variables: {
          id: variantIds,
          calculated_price: {
            context: pricingContext,
          },
        },
      })
    })

    // Extract cluster_id from input
    const cluster_id = transform({ input }, ({ input }) => {
      return (input.items?.[0] as any)?.metadata?.cluster_id
    })

    // Step 1: Get location extensions for the cluster
    const locationExtensionsQuery = when({ cluster_id }, ({ cluster_id }) => {
      return !!cluster_id
    }).then(() => {
      return fetchStockLocationExtensionsStep({
        stock_location_id: cluster_id as string
      })
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
      return fetchLocationHierarchiesStep({
        parent_location_id: darkStoreData.darkStoreLocationId,
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
        const childLocations = locationHierarchies.map((loc: any) => loc.child_location_id)

        // Combine dark store + omni store cluster_id in one array
        return [darkStoreData.darkStoreLocationId, ...childLocations]
      }
    )

    const wrapVariantPrices = wrapVariantsWithSellerPricingStep({priceContext:pricingContext, variants:variants, extraData: {location_ids: darkStoreWithChildrenStockLocation}})

    const variantsWithPrices = transform({ wrapVariantPrices }, ({ wrapVariantPrices }) => {
      return wrapVariantPrices
    })

    validateVariantPricesStep({ variants:variantsWithPrices })

    const lineItems = transform({ input, variants:variantsWithPrices }, (data) => {
      const items = (data.input.items ?? []).map((item) => {
        const variant: any = (data.variants ?? []).find(
          (v) => v.id === item.variant_id
        )!

        // Extract seller_id from item metadata
        const sellerId:any = item.metadata?.seller_id

        const inputData: Input = {
          item,
          variant: variant,
          cartId: data.input.cart_id,
          unitPrice: item.unit_price,
          isTaxInclusive:
            item.is_tax_inclusive ??
            variant?.calculated_price?.is_calculated_price_tax_inclusive,
          isCustomPrice: isDefined(item?.unit_price),
        }

        // Use seller-specific pricing if available and no custom price is set
        if (variant && !isDefined(inputData.unitPrice)) {
          const calculatedPrice = variant.calculated_price as Record<string, any>
          const sellerPrices = calculatedPrice?.seller_prices as Record<string, any>


          if (sellerId && sellerPrices && typeof sellerPrices === 'object' && sellerPrices[sellerId]) {
            // Use seller-specific price
            const sellerPrice = sellerPrices[sellerId]
            inputData.unitPrice = sellerPrice.calculated_amount
            // Also set the compare_at_unit_price for seller-specific pricing
            if (sellerPrice.original_amount && sellerPrice.original_amount !== sellerPrice.calculated_amount) {
              inputData.compareAtUnitPrice = sellerPrice.original_amount
            }
          } else {
            // Fall back to default price
            inputData.unitPrice = variant.calculated_price?.calculated_amount
          }
        }

        return prepareLineItemData(inputData)
      })

      return items
    })

    validateLineItemPricesStep({ items: lineItems })

    // const { itemsToCreate = [], itemsToUpdate = [] } = getLineItemActionsStep({
    //   id: cart.id,
    //   items: lineItems,
    // })

    // Use our custom step that handles seller-based line item splitting
    const lineItemActionsResult = getSellerLineItemActionsStep({
      id: cart.id,
      items: lineItems,
    })

    // Extract items to create and update from the step result
    const itemsToCreate = lineItemActionsResult?.itemsToCreate || []
    const itemsToUpdate = lineItemActionsResult?.itemsToUpdate || []

    const itemsToConfirmInventory = transform(
      { itemsToUpdate, itemsToCreate },
      (data) => {
        return (data.itemsToUpdate as [])
          .concat(data.itemsToCreate as [])
          .filter(
            (
              item:
                | {
                    data: { variant_id: string }
                  }
                | { variant_id?: string }
            ) =>
              isDefined(
                "data" in item ? item.data?.variant_id : item.variant_id
              )
          ) as unknown as ConfirmVariantInventoryWorkflowInputDTO["itemsToUpdate"]
      }
    )

    confirmVariantInventoryWorkflow.runAsStep({
      input: {
        sales_channel_id: cart.sales_channel_id,
        variants,
        items: input.items,
        itemsToUpdate: itemsToConfirmInventory,
        extraData: {location_ids: darkStoreWithChildrenStockLocation},
      },
    })

    const [createdLineItems, updatedLineItems] = parallelize(
      createLineItemsStep({
        id: cart.id,
        items: itemsToCreate as ExtendedLineItem[],
      }),
      updateLineItemsStep({
        id: cart.id,
        items: itemsToUpdate,
      })
    )

    const allItems = transform(
      { createdLineItems, updatedLineItems },
      ({ createdLineItems = [], updatedLineItems = [] }) => {
        return createdLineItems.concat(updatedLineItems)
      }
    )

    const refreshCartData = refreshCartItemsWorkflow.runAsStep({
      input: {
        cart_id: cart.id,
        items: allItems,
        fields: fieldsToUse,
        resolution: input.additional_data?.resolution as string | undefined,
        thumbnail_resolution: input.additional_data?.thumbnail_resolution as string | undefined
      },
    })

    emitEventStep({
      eventName: CartWorkflowEvents.UPDATED,
      data: { id: cart.id },
    })

    return new WorkflowResponse(refreshCartData, {
      hooks: [validate, setPricingContext] as const,
    })
  }
)
