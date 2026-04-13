import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export const AdminCreateTier = z.object({
  name: z.string(),
  promo_id: z.string().nullable().optional(),
  tier_rules: z.array(
    z.object({
      min_purchase_value: z.number().min(0, "Minimum purchase value must be non-negative"),
      currency_code: z.string().min(1, "Currency code is required and cannot be empty"),
    })
  ).optional(),
})

export const AdminUpdateTier = z.object({
  name: z.string().optional(),
  promo_id: z.string().nullable().optional(),
  tier_rules: z.array(
    z.object({
      min_purchase_value: z.number().min(0, "Minimum purchase value must be non-negative"),
      currency_code: z.string().min(1, "Currency code is required and cannot be empty"),
    })
  ).optional(),
})

export const AdminGetTiersParams = createFindParams({
  offset: 0,
  limit: 20,
}).merge(z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  promo_id: z.string().optional(),
  q: z.string().optional(),
}))

export const AdminGetTierCustomersParams = createFindParams({
  offset: 0,
  limit: 15,
})

