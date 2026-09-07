import { MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { CUSTOMER_BANK_MODULE } from "../../../modules/customer-bank-detail"
import CustomerBankModuleService from "../../../modules/customer-bank-detail/service"
import {
  encryptForStorage,
  generateHmac,
  maskAccountHolder,
  maskAccountNumber,
} from "../../../utils/encryption"

export type CreateCustomerBankDetailInputWorkStep = {
  verified_by: string
  customer_bank_account_verification_id: string
  account_number: string
  ifsc_code: string
  account_holder_name: string
  bank_name: string | null
  status: string
  metadata: Record<string, any> | null
  created_by: string
  updated_by: null
}

export const createCustomerBankDetailStep = createStep(
  { name: "create-customer-bank-detail-step" },
  async (input: CreateCustomerBankDetailInputWorkStep, { container }) => {
    const customerBankModuleService: CustomerBankModuleService =
      container.resolve(CUSTOMER_BANK_MODULE)

    const customerBankDetail =
      await customerBankModuleService.createCustomerBankDetails({
        verified_by: input.verified_by,
        customer_bank_account_verification_id:
          input.customer_bank_account_verification_id,
        account_number_enc: encryptForStorage(input.account_number),
        account_number_hmac: generateHmac(input.account_number),
        account_holder_enc: encryptForStorage(input.account_holder_name),
        masked_account: maskAccountNumber(input.account_number),
        masked_holder: maskAccountHolder(input.account_holder_name),
        bank_name: input.bank_name,
        ifsc_code: input.ifsc_code,
        status: input.status,
        metadata: input.metadata,
        created_by: input.created_by,
        updated_by: input.updated_by,
      })

    return new StepResponse(customerBankDetail, customerBankDetail.id)
  },
  async (id: string, { container }) => {
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer Bank Detail ID is required for compensation"
      )
    }
    const customerBankModuleService: CustomerBankModuleService =
      container.resolve(CUSTOMER_BANK_MODULE)
    await customerBankModuleService.softDeleteCustomerBankDetails(id)
  }
)
