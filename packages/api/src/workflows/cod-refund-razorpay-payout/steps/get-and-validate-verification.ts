import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { BankAccountVerificationStatus } from "../../../utils/constants/bank_account_verification"
import CustomerBankAccountVerificationService from "../../../modules/customer-bank-account-verification/service"
import { CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE } from "../../../modules/customer-bank-account-verification"

export type GetAndValidateVerificationStepInput = {
  customerBankAccountVerificationId: string
  return_id: string
}

export const getAndValidateVerificationStep = createStep(
  "get-and-validate-verification-for-cod",
  async (input: GetAndValidateVerificationStepInput, { container }) => {
    const verificationService =
      container.resolve<CustomerBankAccountVerificationService>(
        CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE
      )
    const list = await verificationService.listCustomerBankAccountVerifications({
      id: input.customerBankAccountVerificationId,
    } as any)

    if (!list.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked refund method (bank/UPI). Add and verify bank/UPI when creating the return."
      )
    }

    const verification = list[0] as any

    if (verification.status === BankAccountVerificationStatus.CREATED) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked refund method (bank/UPI). Account is created, but not verified. Check razorpay"
      )
    }

    if (!verification.fund_account_id || !verification.contact_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked refund method (bank/UPI). Razorpay Fund account Id and Contact Id is required to do payouts"
      )
    }

    return new StepResponse({
      fund_account_id: verification.fund_account_id,
      contact_id: verification.contact_id,
      customer_id: verification.customer_id,
    })
  }
)

