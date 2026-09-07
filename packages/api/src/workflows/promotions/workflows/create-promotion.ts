import { PromotionDTO } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import {
  WorkflowResponse,
  createWorkflow,
  transform,
  when
} from '@medusajs/framework/workflows-sdk'
import { createRemoteLinkStep } from '@medusajs/medusa/core-flows'

import { PROMOTION_MODULE } from '../../../modules/promotion_extension'
import { createPromotionStep } from '../steps/create-promotions'

export type CreateCustomFromPromotionWorkflowInput = {
  promotion: PromotionDTO
  additional_data?: {
    custom_tagline?: string | null
    terms_and_conditions?: string[]
    cart_sub_total?: number
    promo_code_upper_limit?: number
    seller_ids?: string[]
    first_customer?: boolean
    for_seller?: boolean
    is_hidden?: boolean
    override_existing?: boolean
    applicable_on?: 'all' | 'app' | 'web'
  }
}

export const createCustomFromPromotionWorkflow = createWorkflow(
  'create-promotion',
  (input: CreateCustomFromPromotionWorkflowInput) => {
    const customName = transform(
      {
        input
      },
      (data) => {
        return {
          custom_tagline: data.input.additional_data?.custom_tagline ?? null,
          terms_and_conditions: data.input.additional_data?.terms_and_conditions || [],
          cart_sub_total: data.input.additional_data?.cart_sub_total || 0,
          promo_code_upper_limit:
            data.input.additional_data?.promo_code_upper_limit || 0,
          seller_ids: data.input.additional_data?.seller_ids || [],
          first_customer: data.input.additional_data?.first_customer || false,
          for_seller: data.input.additional_data?.for_seller || false,
          is_hidden: data.input.additional_data?.is_hidden || false,
          override_existing: data.input.additional_data?.override_existing !== undefined ? data.input.additional_data.override_existing : true,
          applicable_on: data.input.additional_data?.applicable_on ?? 'all'
        }
      }
    )

    const custom = createPromotionStep({
      custom_tagline: customName.custom_tagline,
      terms_and_conditions: customName.terms_and_conditions,
      cart_sub_total: customName.cart_sub_total,
      promo_code_upper_limit: customName.promo_code_upper_limit,
      seller_ids: customName.seller_ids,
      first_customer: customName.first_customer,
      for_seller: customName.for_seller,
      is_hidden: customName.is_hidden,
      override_existing: customName.override_existing,
      applicable_on: customName.applicable_on
    })

    when({ custom }, ({ custom }) => custom !== undefined).then(() => {
      const link = transform({ input, custom }, ({ input, custom }) => {
        return [
          {
            [Modules.PROMOTION]: {
              promotion_id: input.promotion.id
            },
            [PROMOTION_MODULE]: {
              promotion_extension_id: custom.id
            }
          }
        ]
      })
      createRemoteLinkStep(link)
    })

    return new WorkflowResponse(custom)
  }
)

