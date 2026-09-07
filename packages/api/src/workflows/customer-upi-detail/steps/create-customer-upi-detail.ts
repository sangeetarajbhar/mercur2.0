import { MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { CUSTOMER_UPI_MODULE } from "../../../modules/customer-upi-detail"
import CustomerUpiModuleService from "../../../modules/customer-upi-detail/service"
import { encryptForStorage, generateHmac, maskUpiId } from "../../../utils/encryption"

export type CreateCustomerUpiDetailInputWorkStep = {
  verified_by: string
  customer_bank_account_verification_id: string
  upi_id: string
  status: string
  metadata: Record<string, any> | null
  created_by: string
  updated_by: null
}

export const createCustomerUpiDetailStep = createStep(
  { name: "create-customer-upi-detail-step" },
  async (input: CreateCustomerUpiDetailInputWorkStep, { container }) => {
    const customerUpiModuleService: CustomerUpiModuleService =
      container.resolve(CUSTOMER_UPI_MODULE)

    const customerUpiDetail = await customerUpiModuleService.createCustomerUpiDetails({
      verified_by: input.verified_by,
      customer_bank_account_verification_id:
        input.customer_bank_account_verification_id,
      upi_id_enc: encryptForStorage(input.upi_id),
      upi_id_hmac: generateHmac(input.upi_id),
      masked_upi: maskUpiId(input.upi_id),
      status: input.status,
      metadata: input.metadata,
      created_by: input.created_by,
      updated_by: input.updated_by,
    })

    return new StepResponse(customerUpiDetail, customerUpiDetail.id)
  },
  async (id: string, { container }) => {
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer UPI Detail ID is required for compensation"
      )
    }
    const customerUpiModuleService: CustomerUpiModuleService =
      container.resolve(CUSTOMER_UPI_MODULE)
    await customerUpiModuleService.softDeleteCustomerUpiDetails(id)
  }
)
