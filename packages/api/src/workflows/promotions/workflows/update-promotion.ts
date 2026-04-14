import { PromotionDTO } from '@medusajs/framework/types'
import {
  WorkflowResponse,
  createWorkflow,
  transform

} from '@medusajs/framework/workflows-sdk'

import { updatePromotionStep } from '../steps/update-promotions'

export type UpdateCustomFromPromotionWorkflowInput = {
  promotion: PromotionDTO
  promotion_extension_id: string
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

export const updateCustomFromPromotionWorkflow = createWorkflow(
  'update-custom-from-promotion',
  (input: UpdateCustomFromPromotionWorkflowInput) => {
    const customData = transform(
      {
        input
      },
      (data) => {
        const updateData: any = {
          id: data.input.promotion_extension_id,
        }
        
        // Only include fields that are explicitly provided
        if (data.input.additional_data?.cart_sub_total !== undefined) {
          updateData.cart_sub_total = data.input.additional_data.cart_sub_total
        }
        if (data.input.additional_data?.promo_code_upper_limit !== undefined) {
          updateData.promo_code_upper_limit = data.input.additional_data.promo_code_upper_limit
        }
        if (data.input.additional_data?.custom_tagline !== undefined) {
          updateData.custom_tagline = data.input.additional_data.custom_tagline
        }
        if (data.input.additional_data?.terms_and_conditions !== undefined) {
          updateData.terms_and_conditions = data.input.additional_data.terms_and_conditions
        }
        if (data.input.additional_data?.seller_ids !== undefined) {
          updateData.seller_ids = data.input.additional_data.seller_ids
        }
        if (data.input.additional_data?.first_customer !== undefined) {
          updateData.first_customer = data.input.additional_data.first_customer
        }
        if (data.input.additional_data?.for_seller !== undefined) {
          updateData.for_seller = data.input.additional_data.for_seller
        }
        if (data.input.additional_data?.is_hidden !== undefined) {
          updateData.is_hidden = data.input.additional_data.is_hidden
        }
        if (data.input.additional_data?.override_existing !== undefined) {
          updateData.override_existing = data.input.additional_data.override_existing
        }
        if (data.input.additional_data?.applicable_on !== undefined) {
          updateData.applicable_on = data.input.additional_data.applicable_on
        }
        
        return updateData
      }
    )

    const custom = updatePromotionStep({
      id: customData.id,
      ...(customData.cart_sub_total !== undefined && { cart_sub_total: customData.cart_sub_total }),
      ...(customData.promo_code_upper_limit !== undefined && { promo_code_upper_limit: customData.promo_code_upper_limit }),
      ...(customData.custom_tagline !== undefined && { custom_tagline: customData.custom_tagline }),
      ...(customData.terms_and_conditions !== undefined && { terms_and_conditions: customData.terms_and_conditions }),
      ...(customData.seller_ids !== undefined && { seller_ids: customData.seller_ids }),
      ...(customData.first_customer !== undefined && { first_customer: customData.first_customer }),
      ...(customData.for_seller !== undefined && { for_seller: customData.for_seller }),
      ...(customData.is_hidden !== undefined && { is_hidden: customData.is_hidden }),
      ...(customData.override_existing !== undefined && { override_existing: customData.override_existing }),
      ...(customData.applicable_on !== undefined && { applicable_on: customData.applicable_on })
    })

    return new WorkflowResponse(custom)
  }
)


