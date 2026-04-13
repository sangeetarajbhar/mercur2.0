import {
  PriceDTO,
  ProductDTO,
  ProductVariantDTO
} from '@medusajs/framework/types'

export interface WishlistProductVariantDTO extends ProductVariantDTO {
  prices: PriceDTO[]
}

export interface WishlistProduct extends ProductDTO {
  variants: WishlistProductVariantDTO[]
}

export type Wishlist = {
  id: string
  products: WishlistProduct[]
}

export type WishlistItem = {
  wishlist_id: string
  wishlist: Wishlist
}

export type WishlistResponse = WishlistItem[]

export type CreateWishlistDTO = {
  reference: 'product'
  reference_id: string
  customer_id: string
}

export type DeleteWishlistDTO = {
  id: string
  reference_id: string
  customer_id: string
}
