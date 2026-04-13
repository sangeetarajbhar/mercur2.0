import { z } from 'zod'
import { StoreGetCartsCart } from '@medusajs/medusa/api/store/carts/validators'
import { StoreAddCartLineItem, StoreUpdateCartLineItem } from '@medusajs/medusa/api/store/carts/validators'

export type StoreDeleteCartShippingMethodsType = z.infer<
  typeof StoreDeleteCartShippingMethods
>
export const StoreDeleteCartShippingMethods = z.object({
  shipping_method_ids: z.array(z.string())
})

// Extended cart query validator with resolution parameters - extends Medusa's base validator
export type StoreGetCartWithResolutionType = z.infer<
  typeof StoreGetCartWithResolution
>
export const StoreGetCartWithResolution = StoreGetCartsCart.extend({
  resolution: z.string().optional(),
})

// Custom validator for add cart line item - requires seller_id and cluster_id in metadata
export type StoreAddCartLineItemWithMetadataType = z.infer<
  typeof StoreAddCartLineItemWithMetadata
>
export const StoreAddCartLineItemWithMetadata = StoreAddCartLineItem.omit({ metadata: true }).extend({
  metadata: z.object({
    seller_id: z.string().min(1, "seller_id is required in metadata"),
    cluster_id: z.string().min(1, "cluster_id is required in metadata"),
  }).catchall(z.any()) // Allow additional metadata fields
})

// Custom validator for update cart line item - requires cluster_id in metadata
// seller_id will be fetched from the seller-line-item link
export type StoreUpdateCartLineItemWithMetadataType = z.infer<
  typeof StoreUpdateCartLineItemWithMetadata
>
export const StoreUpdateCartLineItemWithMetadata = StoreUpdateCartLineItem.omit({ metadata: true }).extend({
  metadata: z.object({
    cluster_id: z.string().min(1, "cluster_id is required in metadata"),
  }).catchall(z.any()) // Allow additional metadata fields
})
