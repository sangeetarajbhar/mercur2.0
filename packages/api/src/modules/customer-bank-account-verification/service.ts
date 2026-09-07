import { MedusaService } from "@medusajs/framework/utils"

import { customerBankAccountVerification } from "./models/customer_bank_account_verification"

class CustomerBankAccountVerificationService extends MedusaService({
  customerBankAccountVerification,
}) {}

export default CustomerBankAccountVerificationService
