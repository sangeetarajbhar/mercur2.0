import { z } from 'zod'

import { MiddlewareRoute, validateAndTransformBody } from '@medusajs/framework'
import { CampaignBudgetType, isPresent } from '@medusajs/framework/utils'
import {
  ApplicationMethodAllocation,
  ApplicationMethodTargetType,
  ApplicationMethodType,
  PromotionStatus,
  PromotionType
} from '@medusajs/framework/utils'
import { CreatePromotion, UpdatePromotion } from '@medusajs/medusa/api/admin/promotions/validators'

// Define the validator schema
// const AdminCreatePromotion = z.object({
//     additional_data: z.object({}).optional(),
//   cart_sub_total: z.number().optional(),
//   promo_code_upper_limit: z.number().optional(),
//   seller_ids: z.array(z.string()).optional(),
// //   application_method: z.object({}).optional(),
// })
const AdminCreatePromotion = CreatePromotion.extend({
  additional_data: z
    .object({
      custom_tagline: z.string().max(50).nullable().optional(),
      terms_and_conditions: z.array(z.string()).optional(),
      cart_sub_total: z.number().optional(),
      promo_code_upper_limit: z.number().optional(),
      seller_ids: z.array(z.string()).optional(),
      first_customer: z.boolean().optional(),
      for_seller: z.boolean().optional(),
      is_hidden: z.boolean().optional(),
      override_existing: z.boolean().optional(),
      applicable_on: z.enum(["all", "app", "web"]).optional()
    })
    .optional()
})

const AdminUpdatePromotion = UpdatePromotion.extend({
  additional_data: z
    .object({
      custom_tagline: z.string().max(50).nullable().optional(),
      terms_and_conditions: z.array(z.string()).optional(),
      cart_sub_total: z.number().optional(),
      promo_code_upper_limit: z.number().optional(),
      seller_ids: z.array(z.string()).optional(),
      first_customer: z.boolean().optional(),
      for_seller: z.boolean().optional(),
      is_hidden: z.boolean().optional(),
      override_existing: z.boolean().optional(),
      applicable_on: z.enum(["all", "app", "web"]).optional()
    })
    .optional()
}).passthrough()
export const VendorCreateCampaignBudget = z
  .object({
    type: z.nativeEnum(CampaignBudgetType),
    limit: z.number().nullish(),
    currency_code: z.string().nullish(),
    attribute: z.enum(['customer_id']).nullish()
  })
  .strict()
  .refine(
    (data) => {
      // For spend and spend_per types, currency_code is required
      const spendTypeValues = [
        CampaignBudgetType.SPEND,
        'spend',
        'spend_per'
      ]
      const typeStr = String(data.type).toLowerCase()
      return !spendTypeValues.some(v => String(v).toLowerCase() === typeStr) || isPresent(data.currency_code)
    },
    {
      path: ['currency_code'],
      message: 'currency_code is required when budget type is spend or spend_per'
    }
  )
  .refine(
    (data) => {
      // For usage and usage_per types, currency_code should not be present
      const usageTypeValues = [
        CampaignBudgetType.USAGE,
        'usage',
        'usage_per'
      ]
      const typeStr = String(data.type).toLowerCase()
      return !usageTypeValues.some(v => String(v).toLowerCase() === typeStr) || !isPresent(data.currency_code)
    },
    {
      path: ['currency_code'],
      message: 'currency_code should not be present when budget type is usage or usage_per'
    }
  )
  .refine(
    (data) => {
      // For usage_per and spend_per types, attribute is required
      const perAttributeTypeValues = [
        'usage_per',
        'spend_per'
      ]
      const typeStr = String(data.type).toLowerCase()
      return !perAttributeTypeValues.some(v => String(v).toLowerCase() === typeStr) || isPresent(data.attribute)
    },
    {
      path: ['attribute'],
      message: 'attribute is required when budget type is usage_per or spend_per'
    }
  )
  .refine(
    (data) => {
      // For usage and spend types (global), attribute should not be present
      const globalTypeValues = [
        CampaignBudgetType.USAGE,
        CampaignBudgetType.SPEND,
        'usage',
        'spend'
      ]
      const typeStr = String(data.type).toLowerCase()
      return !globalTypeValues.some(v => String(v).toLowerCase() === typeStr) || !isPresent(data.attribute)
    },
    {
      path: ['attribute'],
      message: 'attribute should not be present when budget type is usage or spend (global budgets)'
    }
  )
  .refine(
    (data) => {
      // Only allow customer_id, reject email
      return !isPresent(data.attribute) || data.attribute === 'customer_id'
    },
    {
      path: ['attribute'],
      message: 'Only customer_id is supported as attribute. Email is not supported.'
    }
  )

export const VendorCreatePromotionRule = z
  .object({
    operator: z.enum(['in', 'eq']),
    description: z.string().nullish(),
    attribute: z.string(),
    values: z.union([z.string(), z.array(z.string())])
  })
  .strict()
export const VendorCreateApplicationMethod = z
  .object({
    description: z.string().nullish(),
    value: z.number(),
    max_quantity: z.number().nullish(),
    type: z.literal(ApplicationMethodType.PERCENTAGE),
    target_type: z.literal(ApplicationMethodTargetType.ITEMS),
    allocation: z.nativeEnum(ApplicationMethodAllocation),
    target_rules: z.array(VendorCreatePromotionRule),
    apply_to_quantity: z.number().nullish(),
    buy_rules_min_quantity: z.number().nullish()
  })
  .strict()
export const VendorCreateCampaign = z
  .object({
    name: z.string(),
    campaign_identifier: z.string(),
    description: z.string().nullish(),
    budget: VendorCreateCampaignBudget.nullish(),
    starts_at: z.coerce.date().nullish(),
    ends_at: z.coerce.date().nullish()
  })
  .strict()
export const VendorCreatePromotion = z
  .object({
    code: z.string(),
    status: z.nativeEnum(PromotionStatus).default(PromotionStatus.DRAFT),
    is_automatic: z.boolean().default(false),
    type: z.literal(PromotionType.STANDARD),
    campaign_id: z.string().nullish(),
    campaign: VendorCreateCampaign.optional(),
    application_method: VendorCreateApplicationMethod,
    rules: z.array(VendorCreatePromotionRule).optional(),
    additional_data: z.object({}).optional()
  })
  .strict()

export const promotionMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/promotions',
    middlewares: [
      (req, res, next) => {
        next();
      },
      validateAndTransformBody(AdminCreatePromotion)
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/promotions/:id',
    middlewares: [
      (req, res, next) => {
        next();
      },
      validateAndTransformBody(AdminUpdatePromotion)
    ]
  }
]

