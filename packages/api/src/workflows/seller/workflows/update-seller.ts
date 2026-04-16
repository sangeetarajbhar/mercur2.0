import { WorkflowResponse, createWorkflow, createHook } from '@medusajs/framework/workflows-sdk'

import { UpdateSellerDTO } from '../../../types/seller'

import { updateSellerStep } from '../steps'

export const updateSellerWorkflow = createWorkflow(
  'update-seller-v2',
  function (input: UpdateSellerDTO) {
    const seller = updateSellerStep(input)
    
    const sellerUpdatedHook = createHook('sellerUpdated', {
      sellerId: seller.id,
      seller: seller
    })
    
    return new WorkflowResponse(seller, { hooks: [sellerUpdatedHook] })
  }
)
