import { z } from "zod"
import {
  applyAndAndOrOperators,
  GetProductsParams,
  recursivelyNormalizeSchema,
  StoreGetProductParamsDirectFields,
  transformProductParams,
} from "../../utils/common-validators"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "../../utils/validators"

export const StoreGetProductParamsFields = z.object({
  region_id: z.string().optional(),
  country_code: z.string().optional(),
  province: z.string().optional(),
  cart_id: z.string().optional(),
})

export type StoreGetProductParamsType = z.infer<typeof StoreGetProductParams>

export const StoreGetProductParams = createSelectParams().merge(
  StoreGetProductParamsFields
)

export const StoreGetProductVariantsParamsFields = z.object({
  q: z.string().optional(),
  id: z.union([z.string(), z.array(z.string())]).optional(),
  sku: z.union([z.string(), z.array(z.string())]).optional(),
  options: z
    .object({ value: z.string().optional(), option_id: z.string().optional() })
    .optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
  deleted_at: createOperatorMap().optional(),
})

export type StoreGetProductVariantsParamsType = z.infer<
  typeof StoreGetProductVariantsParams
>
export const StoreGetProductVariantsParams = createFindParams({
  offset: 0,
  limit: 50,
})
  .merge(StoreGetProductVariantsParamsFields)
  .merge(applyAndAndOrOperators(StoreGetProductVariantsParamsFields))

export const StoreGetProductsParamsFields = z
  .object({
    region_id: z.string().optional(),
    country_code: z.string().optional(),
    province: z.string().optional(),
    cart_id: z.string().optional(),
  })
  .merge(GetProductsParams)
  .strict()

export type StoreGetProductsParamsType = z.infer<typeof StoreGetProductsParams>
export const StoreGetProductsParams = createFindParams({
  offset: 0,
  limit: 50,
})
  .merge(StoreGetProductsParamsFields)
  .merge(
    z
      .object({
        variants: z
          .object({
            options: z
              .object({
                value: z.string().optional(),
                option_id: z.string().optional(),
              })
              .optional(),
          })
          .merge(applyAndAndOrOperators(StoreGetProductVariantsParamsFields))
          .optional(),
      })
      .merge(applyAndAndOrOperators(StoreGetProductParamsDirectFields))
      .strict()
  )
  .transform(recursivelyNormalizeSchema(transformProductParams) as any)

// Variant Delivery Promise Params
export const StoreGetVariantDeliveryPromiseParams = createSelectParams().merge(
  z.object({
    pincode: z
      .string()
      .length(6, 'Pincode must be exactly 6 digits')
      .regex(/^\d{6}$/, 'Pincode must contain only numbers'),
    cluster_id: z
      .string()
      .min(1, 'Cluster ID is required'),
    seller_id: z
      .string()
      .optional(),
  })
)

export type StoreGetVariantDeliveryPromiseParamsType = z.infer<typeof StoreGetVariantDeliveryPromiseParams>
