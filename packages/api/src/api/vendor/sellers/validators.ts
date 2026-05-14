import { z } from "zod"
import { createFindParams, createSelectParams } from "@medusajs/medusa/api/utils/validators"

export type VendorGetSellerParamsType = z.infer<typeof VendorGetSellerParams>
export const VendorGetSellerParams = createSelectParams()

export type VendorCreateSellerType = z.infer<typeof VendorCreateSeller>
export const VendorCreateSeller = z
  .object({
    name: z.preprocess((val: string) => val?.trim(), z.string().min(1)),
    description: z.string().nullish().optional(),
    photo: z.string().nullish().optional(),
    email: z.string().email().nullish(),
    phone: z.string().nullish(),
    address_line: z.string().nullish().optional(),
    city: z.string().nullish().optional(),
    state: z.string().nullish().optional(),
    postal_code: z.string().nullish().optional(),
    country_code: z.string().nullish().optional(),
    tax_id: z.string().nullish().optional(),
    member: z.object({
      name: z.string(),
      email: z.string().email(),
      bio: z.string().nullish().optional(),
      phone: z.string().nullish().optional(),
      photo: z.string().nullish().optional(),
    }),
  })
  .strict()

export type VendorUpdateSellerType = z.infer<typeof VendorUpdateSeller>
export const VendorUpdateSeller = z
  .object({
    name: z.preprocess((val: string) => val.trim(), z.string().min(4)).optional(),
    description: z.string().optional(),
    photo: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address_line: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country_code: z.string().optional(),
    tax_id: z.string().optional(),
  })
  .strict()

export type VendorGetReviewsParamsType = z.infer<typeof VendorGetReviewsParams>
export const VendorGetReviewsParams = createFindParams({
  offset: 0,
  limit: 50,
})

export type VendorUpdateReviewType = z.infer<typeof VendorUpdateReview>
export const VendorUpdateReview = z.object({
  seller_note: z.string().max(300),
})

export type VendorGetOnboardingParamsType = z.infer<typeof VendorGetOnboardingParams>
export const VendorGetOnboardingParams = createSelectParams()

