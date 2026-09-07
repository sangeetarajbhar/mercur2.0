import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  BankAccountType,
  CustomerBankDetailStatus,
  CustomerUpiDetailStatus,
} from "../../../utils/constants/bank_account_verification"
import CustomerUpiModuleService from "../../../modules/customer-upi-detail/service"
import { CUSTOMER_UPI_MODULE } from "../../../modules/customer-upi-detail"
import CustomerBankModuleService from "../../../modules/customer-bank-detail/service"
import { CUSTOMER_BANK_MODULE } from "../../../modules/customer-bank-detail"

export type GetCustomerUpiOrBankDetailsStepInput = {
  type: string
  typeId: string
  return_id: string
}

export const getCustomerUpiOrBankDetailsStep = createStep(
  "get-customer-upi-or-bank-details-for-cod",
  async (input: GetCustomerUpiOrBankDetailsStepInput, { container }) => {
    const { type, typeId } = input
    let customerBankAccountVerificationId: string | null = null
    let customerUpiDetail: any = null
    let customerBankDetail: any = null

    if (type === BankAccountType.UPI) {
      const upiService = container.resolve<CustomerUpiModuleService>(CUSTOMER_UPI_MODULE)
      const existingDetails = await upiService.listCustomerUpiDetails(
        { id: typeId, deleted_at: null, status: CustomerUpiDetailStatus.ACTIVE } as any,
        {
          select: [
            "id",
            "customer_bank_account_verification_id",
            "masked_upi",
            "status",
            "created_at",
            "upi_id_hmac",
          ],
        } as any
      )
      if (!existingDetails?.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "COD refund requires a linked return refund type link, upi. Add and verify bank/UPI when creating the return."
        )
      }
      customerBankAccountVerificationId = existingDetails[0].customer_bank_account_verification_id
      customerUpiDetail = existingDetails[0]
    }

    if (type === BankAccountType.BANK) {
      const bankService = container.resolve<CustomerBankModuleService>(CUSTOMER_BANK_MODULE)
      const existingDetails = await bankService.listCustomerBankDetails(
        { id: typeId, deleted_at: null, status: CustomerBankDetailStatus.ACTIVE } as any,
        {
          select: [
            "id",
            "customer_bank_account_verification_id",
            "masked_account",
            "masked_holder",
            "ifsc_code",
            "status",
            "created_at",
          ],
        } as any
      )
      if (!existingDetails?.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "COD refund requires a linked return refund type link, bank. Add and verify bank/UPI when creating the return."
        )
      }
      customerBankAccountVerificationId = existingDetails[0].customer_bank_account_verification_id
      customerBankDetail = existingDetails[0]
    }

    if (!customerBankAccountVerificationId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked return refund type link. Add and verify bank/UPI when creating the return."
      )
    }

    return new StepResponse({
      customerBankAccountVerificationId,
      customerUpiDetail,
      customerBankDetail,
    })
  }
)

