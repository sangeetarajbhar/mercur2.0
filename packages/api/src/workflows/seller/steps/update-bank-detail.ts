import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
const SELLER_MODULE = "seller"
type SellerModuleService = any

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

    const existingBankDetails = await (sellerModuleService as any).listBankDetails({
      seller_id: sellerId,
    })

    let bankDetail: any
    let wasCreated = false
    let previousBankDetail: any = null

    if (bank_detail.id && existingBankDetails.length > 0) {
      const existing = existingBankDetails.find((bd: any) => bd.id === bank_detail.id) || existingBankDetails[0]
      previousBankDetail = existing

      const updatedBankDetails = await (sellerModuleService as any).updateBankDetails([
        { id: existing.id, ...bank_detail, seller_id: sellerId },
      ])
      bankDetail = updatedBankDetails[0]
      wasCreated = false
    } else if (existingBankDetails.length > 0) {
      const existing = existingBankDetails[0]
      previousBankDetail = existing

      const updatedBankDetails = await (sellerModuleService as any).updateBankDetails([
        { id: existing.id, ...bank_detail, seller_id: sellerId },
      ])
      bankDetail = updatedBankDetails[0]
      wasCreated = false
    } else {
      const createdBankDetails = await (sellerModuleService as any).createBankDetails([
        { ...bank_detail, seller_id: sellerId },
      ])
      bankDetail = createdBankDetails[0]
      wasCreated = true
    }

    return new StepResponse(bankDetail, { bankDetail, wasCreated, previousBankDetail })
  },
  async (
    compensationData: { bankDetail: any; wasCreated: boolean; previousBankDetail: any },
    { container }
  ) => {
    if (!compensationData) return

    const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)

    if (compensationData.wasCreated && compensationData.bankDetail?.id) {
      await (sellerModuleService as any).softDeleteBankDetails([compensationData.bankDetail.id])
    } else if (compensationData.previousBankDetail) {
      await (sellerModuleService as any).updateBankDetails([compensationData.previousBankDetail])
    }
  }
)

