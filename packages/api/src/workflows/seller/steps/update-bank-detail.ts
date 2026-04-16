import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { SELLER_MODULE, SellerModuleService } from '../../../modules/seller'

type UpdateBankDetailInput = {
  bank_detail: any
  sellerId: string
}

export const updateSellerBankDetailStep = createStep<UpdateBankDetailInput, any, any>(
  "update-bank-detail",
  async ({ bank_detail, sellerId }, { container }) => {
    if (!bank_detail || !bank_detail.account_number) {
      return new StepResponse(null, null)
    }
    
    const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
    
    // Check if bank detail already exists for this seller
    const existingBankDetails = await sellerModuleService.listBankDetails({ 
      seller_id: sellerId 
    })
    
    let bankDetail: any
    let wasCreated = false
    let previousBankDetail: any = null
    
    if (bank_detail.id && existingBankDetails.length > 0) {
      // ID provided and exists - update existing bank detail
      const existing = existingBankDetails.find(bd => bd.id === bank_detail.id) || existingBankDetails[0]
      previousBankDetail = existing
      
      const updatedBankDetails = await sellerModuleService.updateBankDetails([{
        id: existing.id,
        ...bank_detail,
        seller_id: sellerId
      }])
      bankDetail = updatedBankDetails[0]
      wasCreated = false
    } else if (existingBankDetails.length > 0) {
      // No ID provided but bank detail exists - update the existing one
      const existing = existingBankDetails[0]
      previousBankDetail = existing
      
      const updatedBankDetails = await sellerModuleService.updateBankDetails([{
        id: existing.id,
      ...bank_detail,
        seller_id: sellerId
      }])
      bankDetail = updatedBankDetails[0]
      wasCreated = false
    } else {
      // No bank detail exists - create new one
      const bankDetailToCreate = {
        ...bank_detail,
        seller_id: sellerId
      }
      
      const createdBankDetails = await sellerModuleService.createBankDetails([bankDetailToCreate])
      bankDetail = createdBankDetails[0]
      wasCreated = true
    }
    
    // Return bank detail and compensation data
    return new StepResponse(bankDetail, { bankDetail, wasCreated, previousBankDetail })
  },
  async (compensationData: { bankDetail: any, wasCreated: boolean, previousBankDetail: any }, { container }) => {
    if (!compensationData) return
    
    const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
    
    if (compensationData.wasCreated && compensationData.bankDetail?.id) {
      // Rollback: delete created bank detail
      await sellerModuleService.softDeleteBankDetails([compensationData.bankDetail.id])
    } else if (compensationData.previousBankDetail) {
    // Rollback: restore previous bank detail
      await sellerModuleService.updateBankDetails([compensationData.previousBankDetail])
    }
  }
)