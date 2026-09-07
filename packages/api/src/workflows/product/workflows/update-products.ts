// import { updateProductsStep } from "../steps/update-products"

import {
  AdditionalData,
  CreateMoneyAmountDTO,
  ProductTypes,
  UpdateProductVariantWorkflowInputDTO,
} from "@medusajs/framework/types"
import {
  Modules,
  ProductWorkflowEvents,
  arrayDifference,
  isDefined,
} from "@medusajs/framework/utils"
import {
  WorkflowData,
  WorkflowResponse,
  createHook,
  createWorkflow,
  parallelize,
  transform,
} from "@medusajs/framework/workflows-sdk"
import {
  createRemoteLinkStep,
  dismissRemoteLinkStep,
  emitEventStep,
  useQueryGraphStep,
  useRemoteQueryStep,
  createLinksWorkflow,
  deleteInventoryItemWorkflow,
  createInventoryItemsWorkflow,
  upsertVariantPricesWorkflow,
  updateProductsStep
} from '@medusajs/medusa/core-flows'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Knex } from 'knex'
import { ensureVariantPriceSetsStep } from '../steps'
// import { createLinksWorkflow } from "@medusajs/medusa/core-flows"
// import { deleteInventoryItemWorkflow } from "@medusajs/medusa/core-flows"
// import { createInventoryItemsWorkflow } from "@medusajs/medusa/core-flows"
// import { upsertVariantPricesWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Update products that match a specified selector, along with custom data that's passed to the workflow's hooks.
 */
export type UpdateProductsWorkflowInputSelector = {
  /**
   * The filters to find products to update.
   */
  selector: ProductTypes.FilterableProductProps
  /**
   * The data to update the products with.
   */
  update: Omit<ProductTypes.UpdateProductDTO, "variants"> & {
    /**
     * The sales channels that the products are available in.
     */
    sales_channels?: { id: string }[]
    /**
     * The variants to update.
     */
    variants?: UpdateProductVariantWorkflowInputDTO[]
    /**
     * The shipping profile to set.
     */
    shipping_profile_id?: string | null
  }
} & AdditionalData

/**
 * Update one or more products, along with custom data that's passed to the workflow's hooks.
 */
export type UpdateProductsWorkflowInputProducts = {
  /**
   * The products to update.
   */
  products: (Omit<ProductTypes.UpsertProductDTO, "variants"> & {
    /**
     * The sales channels that the products are available in.
     */
    sales_channels?: { id: string }[]
    /**
     * The variants to update.
     */
    variants?: UpdateProductVariantWorkflowInputDTO[]
    /**
     * The shipping profile to set.
     */
    shipping_profile_id?: string | null
  })[]
} & AdditionalData

/**
 * The data to update one or more products, along with custom data that's passed to the workflow's hooks.
 */
export type UpdateProductWorkflowInput =
  | UpdateProductsWorkflowInputSelector
  | UpdateProductsWorkflowInputProducts

function prepareUpdateProductInput({
  input,
}: {
  input: UpdateProductWorkflowInput
}): UpdateProductWorkflowInput {
  if ("products" in input) {
    if (!input.products.length) {
      return { products: [] }
    }

    return {
      products: input.products.map((p) => ({
        ...p,
        sales_channels: undefined,
        shipping_profile_id: undefined,
        variants: p.variants?.map((v) => ({
          ...v,
          prices: undefined,
        })),
      })),
    }
  }

  return {
    selector: input.selector,
    update: {
      ...input.update,
      sales_channels: undefined,
      shipping_profile_id: undefined,
      variants: input.update?.variants?.map((v) => ({
        ...v,
        prices: undefined,
      })),
    },
  }
}

// This helper finds the IDs of products that have associated sales channels.
function findProductsWithSalesChannels({
  updatedProducts,
  input,
}: {
  updatedProducts: ProductTypes.ProductDTO[]
  input: UpdateProductWorkflowInput
}) {
  const productIds = updatedProducts.map((p) => p.id)

  if ("products" in input) {
    const discardedProductIds: string[] = input.products
      .filter((p) => !p.sales_channels)
      .map((p) => p.id as string)
    return arrayDifference(productIds, discardedProductIds)
  }

  return !input.update?.sales_channels ? [] : productIds
}

function findProductsWithShippingProfiles({
  updatedProducts,
  input,
}: {
  updatedProducts: ProductTypes.ProductDTO[]
  input: UpdateProductWorkflowInput
}) {
  const productIds = updatedProducts.map((p) => p.id)

  if ("products" in input) {
    const discardedProductIds: string[] = input.products
      .filter((p) => !isDefined(p.shipping_profile_id))
      .map((p) => p.id as string)
    return arrayDifference(productIds, discardedProductIds)
  }

  return !isDefined(input.update?.shipping_profile_id) ? [] : productIds
}

function prepareSalesChannelLinks({
  input,
  updatedProducts,
}: {
  updatedProducts: ProductTypes.ProductDTO[]
  input: UpdateProductWorkflowInput
}): Record<string, Record<string, any>>[] {
  if ("products" in input) {
    if (!input.products.length) {
      return []
    }

    return input.products
      .filter((p) => p.sales_channels)
      .flatMap((p) =>
        p.sales_channels!.map((sc) => ({
          [Modules.PRODUCT]: {
            product_id: p.id,
          },
          [Modules.SALES_CHANNEL]: {
            sales_channel_id: sc.id,
          },
        }))
      )
  }

  if (input.selector && input.update?.sales_channels?.length) {
    return updatedProducts.flatMap((p) =>
      input.update.sales_channels!.map((channel) => ({
        [Modules.PRODUCT]: {
          product_id: p.id,
        },
        [Modules.SALES_CHANNEL]: {
          sales_channel_id: channel.id,
        },
      }))
    )
  }

  return []
}

function prepareShippingProfileLinks({
  input,
  updatedProducts,
}: {
  updatedProducts: ProductTypes.ProductDTO[]
  input: UpdateProductWorkflowInput
}): Record<string, Record<string, any>>[] {
  if ("products" in input) {
    if (!input.products.length) {
      return []
    }

    return input.products
      .filter((p) => typeof p.shipping_profile_id === "string")
      .map((p) => ({
        [Modules.PRODUCT]: {
          product_id: p.id,
        },
        [Modules.FULFILLMENT]: {
          shipping_profile_id: p.shipping_profile_id,
        },
      }))
  }

  if (input.selector && typeof input.update?.shipping_profile_id === "string") {
    return updatedProducts.map((p) => ({
      [Modules.PRODUCT]: {
        product_id: p.id,
      },
      [Modules.FULFILLMENT]: {
        shipping_profile_id: input.update.shipping_profile_id,
      },
    }))
  }

  return []
}

function prepareVariantPrices({
  input,
  updatedProducts,
}: {
  updatedProducts: ProductTypes.ProductDTO[]
  input: UpdateProductWorkflowInput
}): {
  variant_id: string
  product_id: string
  prices?: CreateMoneyAmountDTO[]
}[] {
  if ("products" in input) {
    if (!input.products.length) {
      return []
    }

    // Note: We rely on the ordering of input and update here.
    return input.products.flatMap((product, i) => {
      if (!product.variants?.length) {
        return []
      }

      const updatedProduct = updatedProducts[i]
      return product.variants.map((variant, j) => {
        const updatedVariant = updatedProduct.variants[j]

        return {
          product_id: updatedProduct.id,
          variant_id: updatedVariant.id,
          prices: variant.prices,
        }
      })
    })
  }

  if (input.selector && input.update?.variants?.length) {
    return updatedProducts.flatMap((p) => {
      return input.update.variants!.map((variant, i) => ({
        product_id: p.id,
        variant_id: p.variants[i].id,
        prices: variant.prices,
      }))
    })
  }

  return []
}

function prepareToDeleteSalesChannelLinks({
  currentSalesChannelLinks,
}: {
  currentSalesChannelLinks: {
    product_id: string
    sales_channel_id: string
  }[]
}) {
  if (!currentSalesChannelLinks.length) {
    return []
  }

  return currentSalesChannelLinks.map(({ product_id, sales_channel_id }) => ({
    [Modules.PRODUCT]: {
      product_id,
    },
    [Modules.SALES_CHANNEL]: {
      sales_channel_id,
    },
  }))
}

function prepareToDeleteShippingProfileLinks({
  currentShippingProfileLinks,
}: {
  currentShippingProfileLinks: {
    product_id: string
    shipping_profile_id: string
  }[]
}) {
  if (!currentShippingProfileLinks.length) {
    return []
  }

  return currentShippingProfileLinks.map(
    ({ product_id, shipping_profile_id }) => ({
      [Modules.PRODUCT]: {
        product_id,
      },
      [Modules.FULFILLMENT]: {
        shipping_profile_id,
      },
    })
  )
}

export const updateProductsWorkflowId = "update-products-custom"
/**
 * This workflow updates one or more products. It's used by the [Update Product Admin API Route](https://docs.medusajs.com/api/admin#products_postproductsid).
 *
 * This workflow has a hook that allows you to perform custom actions on the updated products. For example, you can pass under `additional_data` custom data that
 * allows you to update custom data models linked to the products.
 *
 * You can also use this workflow within your customizations or your own custom workflows, allowing you to wrap custom logic around product update.
 *
 * @example
 * To update products by their IDs:
 *
 * ```ts
 * const { result } = await updateProductsWorkflow(container)
 * .run({
 *   input: {
 *     products: [
 *       {
 *         id: "prod_123",
 *         title: "Shirts"
 *       },
 *       {
 *         id: "prod_321",
 *         variants: [
 *           {
 *             id: "variant_123",
 *             options: {
 *               Size: "S"
 *             }
 *           }
 *         ]
 *       }
 *     ],
 *     additional_data: {
 *       erp_id: "erp_123"
 *     }
 *   }
 * })
 * ```
 *
 * You can also update products by a selector:
 *
 * ```ts
 * const { result } = await updateProductsWorkflow(container)
 * .run({
 *   input: {
 *     selector: {
 *       type_id: ["ptyp_123"]
 *     },
 *     update: {
 *       description: "This is a shirt product"
 *     },
 *     additional_data: {
 *       erp_id: "erp_123"
 *     }
 *   }
 * })
 * ```
 *
 * @summary
 *
 * Update one or more products with options and variants.
 *
 * @property hooks.productsUpdated - This hook is executed after the products are updated. You can consume this hook to perform custom actions on the updated products.
 */
export const updateProductsWorkflow = createWorkflow(
  updateProductsWorkflowId,
  (input: WorkflowData<UpdateProductWorkflowInput>) => {
    // We only get the variant ids of products that are updating the variants and prices.
    const variantIdsSelector = transform({ input }, (data) => {
      if ("products" in data.input) {
        return {
          filters: {
            id: data.input.products
              .filter((p) => !!p.variants)
              .map((p) => p.id),
          },
        }
      }

      return {
        filters: data.input.update?.variants ? data.input.selector : { id: [] },
      }
    })
    const previousProductsWithVariants = useRemoteQueryStep({
      entry_point: "product",
      fields: ["variants.id"],
      variables: variantIdsSelector,
    }).config({ name: "get-previous-products-variants-step" })

    const previousVariantIds = transform(
      { previousProductsWithVariants },
      (data) => {
        return data.previousProductsWithVariants.flatMap((p) =>
          p.variants?.map((v) => v.id)
        )
      }
    )

    const toUpdateInput = transform({ input }, prepareUpdateProductInput)
    const updatedProducts = updateProductsStep(toUpdateInput)

    const salesChannelLinks = transform(
      { input, updatedProducts },
      prepareSalesChannelLinks
    )

    const shippingProfileLinks = transform(
      { input, updatedProducts },
      prepareShippingProfileLinks
    )

    const variantPrices = transform(
      { input, updatedProducts },
      prepareVariantPrices
    )

    const productsWithSalesChannels = transform(
      { updatedProducts, input },
      findProductsWithSalesChannels
    )

    const productsWithShippingProfiles = transform(
      { updatedProducts, input },
      findProductsWithShippingProfiles
    )

    const currentSalesChannelLinks = useRemoteQueryStep({
      entry_point: "product_sales_channel",
      fields: ["product_id", "sales_channel_id"],
      variables: { filters: { product_id: productsWithSalesChannels } },
    }).config({ name: "get-current-sales-channel-links-step" })

    const currentShippingProfileLinks = useRemoteQueryStep({
      entry_point: "product_shipping_profile",
      fields: ["product_id", "shipping_profile_id"],
      variables: { filters: { product_id: productsWithShippingProfiles } },
    }).config({ name: "get-current-shipping-profile-links-step" })

    const toDeleteSalesChannelLinks = transform(
      { currentSalesChannelLinks },
      prepareToDeleteSalesChannelLinks
    )

    const toDeleteShippingProfileLinks = transform(
      { currentShippingProfileLinks },
      prepareToDeleteShippingProfileLinks
    )

    // Mapping Custom Code
    // Get current variant IDs after update
    const currentVariantIds = transform({ updatedProducts }, (data) => {
      return data.updatedProducts.flatMap((p) =>
        p.variants?.map((v) => v.id) ?? []
      )
    })

    // Find deleted variants (variants that existed before but not after update)
    const deletedVariantIds = transform(
      { previousVariantIds, currentVariantIds },
      (data) => {
        return arrayDifference(data.previousVariantIds, data.currentVariantIds)
      }
    )

    // Find new variants (variants that exist after but not before update)
    const newVariantIds = transform(
      { previousVariantIds, currentVariantIds },
      (data) => {
        return arrayDifference(data.currentVariantIds, data.previousVariantIds)
      }
    )

    // Handle inventory cleanup for deleted variants
    const variantsWithInventoryForDeletion = useQueryGraphStep({
      entity: "variants",
      fields: [
        "id",
        "manage_inventory",
        "inventory.id",
        "inventory.variants.id",
      ],
      filters: {
        id: deletedVariantIds,
      },
    }).config({ name: "get-deleted-variants-inventory-step" })

    const toDeleteInventoryItemIds = transform(
      { variants: variantsWithInventoryForDeletion.data as any },
      (data: { variants: any }) => {
        const variants: any = data.variants || []
        const variantsMap = new Map(variants.map((v) => [v.id, true]))
        const toDeleteIds: Set<string> = new Set()

        variants.forEach((variant) => {
          if (!variant.manage_inventory) {
            return
          }

          for (const inventoryItem of variant.inventory) {
            if (inventoryItem.variants.every((v) => variantsMap.has(v.id))) {
              toDeleteIds.add(inventoryItem.id)
            }
          }
        })

        return Array.from(toDeleteIds)
      }
    )

    deleteInventoryItemWorkflow.runAsStep({
      input: toDeleteInventoryItemIds,
    }).config({ name: "delete-inventory-items-for-deleted-variants-step" })

    // Handle inventory creation for new variants
    const newVariantsWithDetails = useQueryGraphStep({
      entity: "variants",
      fields: [
        "id",
        "manage_inventory",
        "sku",
        "origin_country",
        "mid_code",
        "material",
        "weight",
        "length",
        "height",
        "width",
        "title",
        "hs_code",
        "inventory_items.inventory_item_id",
      ],
      filters: {
        id: newVariantIds,
      },
    }).config({ name: "get-new-variants-details-step" })

    // Check for existing inventory items by SKU
    const existingInventoryItemsBySku = useQueryGraphStep({
      entity: "inventory_item",
      fields: ["id", "sku"],
      filters: {
        sku: transform(
          { newVariants: newVariantsWithDetails.data as any },
          (data: { newVariants: any }) => {
            const newVariantsAny: any = (data as any).newVariants
            const variants = Array.isArray(newVariantsAny?.variants)
              ? newVariantsAny.variants
              : Array.isArray(newVariantsAny)
                ? newVariantsAny
                : []
            return variants
              .filter((v: any) => v.manage_inventory && v.sku && (!v.inventory_items || v.inventory_items.length === 0))
              .map((v: any) => v.sku)
              .filter(Boolean)
          }
        ),
      },
    }).config({ name: "check-existing-inventory-items-by-sku-step" })

    const inventoryItemsToCreate = transform(
      {
        newVariants: newVariantsWithDetails.data as any,
        existingInventoryItems: existingInventoryItemsBySku.data as any,
      },
      (data) => {
        const newVariantsAny: any = data.newVariants
        const variants = Array.isArray(newVariantsAny?.variants)
          ? newVariantsAny.variants
          : Array.isArray(newVariantsAny)
            ? newVariantsAny
            : []
        
        const existingItems: any[] = Array.isArray((data as any).existingInventoryItems)
          ? (data as any).existingInventoryItems
          : []
        
        const existingSkus = new Set(existingItems.map((item: any) => item.sku))
        const itemsToCreate: any[] = []

        variants.forEach((variant: any) => {
          // Only create inventory item if:
          // 1. Variant manages inventory
          // 2. Variant doesn't already have inventory items linked
          // 3. No existing inventory item with the same SKU
          if (
            variant.manage_inventory &&
            (!variant.inventory_items || variant.inventory_items.length === 0) &&
            variant.sku &&
            !existingSkus.has(variant.sku)
          ) {
            itemsToCreate.push({
              sku: variant.sku,
              origin_country: variant.origin_country,
              mid_code: variant.mid_code,
              material: variant.material,
              weight: variant.weight,
              length: variant.length,
              height: variant.height,
              width: variant.width,
              title: variant.title,
              description: variant.title,
              hs_code: variant.hs_code,
              requires_shipping: true,
            })
          }
        })

        return itemsToCreate
      }
    )

    const createdInventoryItems = createInventoryItemsWorkflow.runAsStep({
      input: {
        items: inventoryItemsToCreate,
      },
    }).config({ name: "create-inventory-items-for-new-variants-step" })

    // Step to delete existing variant-inventory mappings for existing inventory items
    const deleteExistingMappingsStep = createStep(
      "delete-existing-variant-inventory-mappings",
      async (
        { newVariants, existingInventoryItems }: { newVariants: any, existingInventoryItems: any },
        { container }
      ) => {
        const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
        
        const newVariantsAny: any = newVariants
        const variants = Array.isArray(newVariantsAny?.variants)
          ? newVariantsAny.variants
          : Array.isArray(newVariantsAny)
            ? newVariantsAny
            : []
        
        const existingItems: any[] = Array.isArray(existingInventoryItems)
          ? existingInventoryItems
          : []
        
        const skuToInventoryItemId = new Map(
          existingItems.map((item: any) => [item.sku, item.id])
        )

        const inventoryItemIdsToCleanup: string[] = []
        
        variants.forEach((variant: any) => {
          if (
            variant.manage_inventory &&
            variant.sku &&
            skuToInventoryItemId.has(variant.sku)
          ) {
            const inventoryItemId = skuToInventoryItemId.get(variant.sku)
            if (inventoryItemId) {
              inventoryItemIdsToCleanup.push(inventoryItemId)
            }
          }
        })

        // Delete existing variant-inventory mappings for these inventory items
        if (inventoryItemIdsToCleanup.length > 0) {
          await knex('product_variant_inventory_item')
            .whereIn('inventory_item_id', inventoryItemIdsToCleanup)
            .whereNull('deleted_at')
            .update({ deleted_at: knex.fn.now() })
        }

        return new StepResponse({ deleted: inventoryItemIdsToCleanup.length })
      }
    )

    // Delete existing mappings before creating new ones
    deleteExistingMappingsStep({
      newVariants: newVariantsWithDetails.data,
      existingInventoryItems: existingInventoryItemsBySku.data
    }).config({
      name: "delete-existing-variant-inventory-mappings-step",
    })

    // Link new variants to their inventory items (both existing and newly created)
    const variantInventoryLinks = transform(
      {
        newVariants: newVariantsWithDetails.data as any,
        createdInventoryItems: createdInventoryItems as any,
        existingInventoryItems: existingInventoryItemsBySku.data as any,
      },
      (data) => {
        const newVariantsAny: any = data.newVariants
        const variants = Array.isArray(newVariantsAny?.variants)
          ? newVariantsAny.variants
          : Array.isArray(newVariantsAny)
            ? newVariantsAny
            : []

        // Get newly created inventory items
        const createdItems: any[] =
          (data.createdInventoryItems as any)?.inventory_items ||
          (Array.isArray(data.createdInventoryItems)
            ? data.createdInventoryItems
            : [])

        // Get existing inventory items
        const existingItems: any[] = Array.isArray((data as any).existingInventoryItems)
          ? (data as any).existingInventoryItems
          : []
        
        const skuToInventoryItemId = new Map(
          existingItems.map((item: any) => [item.sku, item.id])
        )

        const links: any[] = []
        let createdInventoryIndex = 0

        variants.forEach((variant: any) => {
          if (
            variant.manage_inventory &&
            (!variant.inventory_items || variant.inventory_items.length === 0) &&
            variant.sku
          ) {
            let inventoryItemId: string | undefined

            // Check if inventory item exists by SKU
            if (skuToInventoryItemId.has(variant.sku)) {
              // Use existing inventory item
              inventoryItemId = skuToInventoryItemId.get(variant.sku)
            } else if (createdItems[createdInventoryIndex]) {
              // Use newly created inventory item
              inventoryItemId = createdItems[createdInventoryIndex].id
              createdInventoryIndex += 1
            }

            if (inventoryItemId) {
              links.push({
                [Modules.PRODUCT]: { variant_id: variant.id },
                [Modules.INVENTORY]: {
                  inventory_item_id: inventoryItemId,
                },
                data: { required_quantity: 1 },
              })
            }
          }
        })

        return links
      }
    )

    createLinksWorkflow.runAsStep({ input: variantInventoryLinks }).config({
      name: "link-new-variants-to-inventory-items-step",
    })

    // End Mapping Custom Code

    // Ensure price sets exist for variants that have prices
    ensureVariantPriceSetsStep({ variantPrices }).config({
      name: "ensure-price-sets-exist-step",
    })

    upsertVariantPricesWorkflow.runAsStep({
      input: { variantPrices, previousVariantIds },
    })

    dismissRemoteLinkStep(toDeleteSalesChannelLinks).config({
      name: "delete-sales-channel-links-step",
    })

    dismissRemoteLinkStep(toDeleteShippingProfileLinks).config({
      name: "delete-shipping-profile-links-step",
    })

    const productIdEvents = transform(
      { updatedProducts },
      ({ updatedProducts }) => {
        return updatedProducts?.map((p) => {
          return { id: p.id }
        })
      }
    )

    parallelize(
      createRemoteLinkStep(salesChannelLinks).config({
        name: "create-sales-channel-links-step",
      }),
      createRemoteLinkStep(shippingProfileLinks).config({
        name: "create-shipping-profile-links-step",
      }),
      emitEventStep({
        eventName: ProductWorkflowEvents.UPDATED,
        data: productIdEvents,
      })
    )

    const productsUpdated = createHook("productsUpdated", {
      products: updatedProducts,
      additional_data: input.additional_data,
    })

    return new WorkflowResponse(updatedProducts, {
      hooks: [productsUpdated],
    })
  }
)
