import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'
import { SellerStatus } from '@mercurjs/types'


export type AdminSellerParamsType = z.infer<typeof AdminSellerParams>
export const AdminSellerParams = createFindParams({
  offset: 0,
  limit: 50
}).extend({
  status: z
    .preprocess((val) => {
      const normalize = (input: unknown) =>
        typeof input === 'string' ? input.toLowerCase() : input

      if (Array.isArray(val)) {
        return val.map(normalize)
      }

      // Handles querystring forms like status[0]=open&status[1]=suspended
      if (val && typeof val === 'object') {
        const values = Object.values(val as Record<string, unknown>)
        return values.map(normalize)
      }

      return normalize(val)
    }, z.union([z.nativeEnum(SellerStatus), z.array(z.nativeEnum(SellerStatus))]))
    .optional()
})

export type AdminGetSellerProductsParamsType = z.infer<
  typeof AdminGetSellerProductsParams
>
export const AdminGetSellerProductsParams = createFindParams({
  offset: 0,
  limit: 50
})

export type AdminGetSellerOrdersParamsType = z.infer<
  typeof AdminGetSellerOrdersParams
>
export const AdminGetSellerOrdersParams = createFindParams({
  offset: 0,
  limit: 50
})

export type AdminGetSellerCustomerGroupsParamsType = z.infer<
  typeof AdminGetSellerCustomerGroupsParams
>
export const AdminGetSellerCustomerGroupsParams = createFindParams({
  offset: 0,
  limit: 50
})

export type AdminUpdateSellerType = z.infer<typeof AdminUpdateSeller>
export const AdminUpdateSeller = z
  .object({
    name: z
      .preprocess((val: string) => val.trim(), z.string().min(4))
      .optional(),
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
    status: z.nativeEnum(SellerStatus).optional()
  })
  .strict()

export type AdminInviteSellerType = z.infer<typeof AdminInviteSeller>
export const AdminInviteSeller = z.object({
  email: z.string().email(),
  registration_url: z.string().default('http://localhost:5173/register')
})

/** When omitted (as in legacy Zilo payloads), seller currency defaults to `inr`. */
const defaultSellerCurrency = z.preprocess(
  (val: unknown) => {
    if (val === undefined || val === null) return "inr"
    if (typeof val === "string") {
      const t = val.trim()
      return t.length > 0 ? t.toLowerCase() : "inr"
    }
    return "inr"
  },
  z.string().min(1)
)

export const createSellerOnboardingSchema = z.object({
  name: z.string(),
  display_name: z.string().optional(),
  currency_code: defaultSellerCurrency,
  barcode: z.string().optional(),
  entity_type: z.enum(["PRIVATE_LIMITED", "PROPRIETORSHIP", "PARTNERSHIP"]).nullable().optional(),
  msme: z.preprocess(
    (val) => {
      if (val === "true") return true
      if (val === "false") return false
      return val
    },
    z.boolean()
  ),
  seller_type: z.enum(["BRAND", "SELLER", "DISTRIBUTOR"]).nullable().optional(),
  description: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address_line: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country_code: z.string().optional(),
  tax_id: z.string().optional(),
  member: z.object({
    name: z.string(),
    email: z.string().email(),
    bio: z.string().optional(),
    phone: z.string().optional(),
    photo: z.string().url().optional().nullable(),
  }),
  company_spocs: z.array(z.any()),
  kyc_documents: z.array(z.object({
    kyc_type: z.string(),
    value: z.string().optional(),
    file_url: z.string().optional(),
  })),
  brand_associations: z.array(z.any()),
  bank_detail: z.any(),
})

export const updateSellerOnboardingSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  display_name: z.string().optional(),
  barcode: z.string().optional(),
  entity_type: z.enum(["PRIVATE_LIMITED", "PROPRIETORSHIP", "PARTNERSHIP"]).nullable().optional(),
  msme: z.preprocess(
    (val) => {
      if (val === "true") return true
      if (val === "false") return false
      return val
    },
    z.boolean()
  ).optional(),
  seller_type: z.enum(["BRAND", "SELLER", "DISTRIBUTOR"]).nullable().optional(),
  description: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address_line: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country_code: z.string().optional(),
  tax_id: z.string().optional(),
  member: z.any().optional(),
  company_spocs: z.array(z.any()).optional(),
  kyc_documents: z.array(z.any()).optional(),
  brand_associations: z.object({
    update: z.array(z.any()).optional(),
    delete: z.array(z.string()).optional(),
  }).optional(),
  bank_detail: z.object({
    id: z.string().optional(),
    account_number: z.string().optional(),
    ifsc_code: z.string().optional(),
    bank_name: z.string().optional(),
    branch_name: z.string().optional(),
    account_type: z.enum(["SAVINGS", "CURRENT"]).nullable().optional(),
    entity_type: z.enum(["PRIVATE_LIMITED", "PROPRIETORSHIP", "PARTNERSHIP"]).nullable().optional(),
    account_verified: z.preprocess(
      (val) => {
        if (val === "true") return true
        if (val === "false") return false
        return val
      },
      z.boolean()
    )
  }).optional(),
})

export const updateSellerBrandAssociationsSchema = z.object({
  brand_ids: z.array(z.string()).default([])
})