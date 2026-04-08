import { Module } from "@medusajs/framework/utils"
import CustomerBankAccountVerificationService from "./service"

export const CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE =
  "customer_bank_account_verification"

export default Module(CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE, {
  service: CustomerBankAccountVerificationService,
})
