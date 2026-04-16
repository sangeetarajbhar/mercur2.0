import {
    WorkflowResponse,
    createWorkflow,
  } from '@medusajs/framework/workflows-sdk'
  
  import { updateSellerBrandAssociationsStep } from '../steps'
  
  type UpdateSellerBrandAssociationsInput = {
    sellerId: string
    brand_associations?: {
      update?: { brand_id: string }[]  // Brands to add/map
      delete?: string[]                  // Brand IDs to unmap/remove
    }
  }
  
  export const updateSellerBrandAssociationsWorkflow = createWorkflow<UpdateSellerBrandAssociationsInput, { added: string[]; removed: string[] }, []>(
    'update-seller-brand-associations',
    (input: UpdateSellerBrandAssociationsInput) => {
    const result = updateSellerBrandAssociationsStep({
      sellerId: input.sellerId,
      brand_associations: input.brand_associations,
    })
  
    return new WorkflowResponse(result)
  })