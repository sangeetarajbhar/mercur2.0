import { z } from 'zod'
export type StoreGetWishlistsParamsType = z.infer<
  typeof StoreGetWishlistsParams
>

export const StoreGetWishlistsParams = z.object({
  offset: z.coerce.number().int().min(0).default(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
})

export type StoreCreateWishlistType = z.infer<typeof StoreCreateWishlist>

export const StoreCreateWishlist = z.object({
  reference: z.enum(['product']),
  reference_id: z.string()
})

