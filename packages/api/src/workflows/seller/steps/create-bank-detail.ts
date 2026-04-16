import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SellerModuleService } from "../../../modules/seller"
import { SELLER_MODULE } from "../../../modules/seller"

type CreateBankDetailInput = {
  sellerId: string
  bank_detail: any
}

export const createBankDetailStep = createStep(
  "create-bank-detail",
  async (input: CreateBankDetailInput, { container }) => {
    const sellerModuleService = container.resolve<SellerModuleService>(SELLER_MODULE)
    
    // Handle empty or undefined bank_detail
    if (!input.bank_detail || !input.bank_detail.account_number) {
      return new StepResponse(null, "")
    }

    // Check if bank detail already exists for this seller
    const existingBankDetails = await sellerModuleService.listBankDetails({ 
      seller_id: input.sellerId 
    })

    let bankDetail: any
    let wasCreated = false

    if (existingBankDetails.length > 0) {
      // Update existing bank detail instead of creating new one
      const existingId = existingBankDetails[0].id
      const updatedBankDetails = await sellerModuleService.updateBankDetails([{
        id: existingId,
        ...input.bank_detail,
        seller_id: input.sellerId
      }])
      bankDetail = updatedBankDetails[0]
      wasCreated = false
    } else {
      // Create new bank detail
      const bankDetailToCreate = {
        ...input.bank_detail,
        seller_id: input.sellerId
      }
      
      const createdBankDetails = await sellerModuleService.createBankDetails([bankDetailToCreate])
      bankDetail = createdBankDetails[0]
      wasCreated = true
    }

    return new StepResponse(bankDetail, { id: bankDetail.id, wasCreated })
  },
  async (compensationData: { id: string, wasCreated: boolean } | string, { container }) => {
    // Handle both old (string) and new (object) compensation data formats
    const bankDetailId = typeof compensationData === 'string' ? compensationData : compensationData?.id
    const wasCreated = typeof compensationData === 'object' ? compensationData?.wasCreated : true
    
    if (!bankDetailId || !wasCreated) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Bank detail ID is required for compensation'
      )
    }
    
    const sellerModuleService = container.resolve<SellerModuleService>(SELLER_MODULE)
    await sellerModuleService.softDeleteBankDetails([bankDetailId])
  }
)
