import { Module } from "@medusajs/framework/utils"
import CustomerBankModuleService from "./service"

export const CUSTOMER_BANK_MODULE = "customer_bank_detail"

export default Module(CUSTOMER_BANK_MODULE, {
  service: CustomerBankModuleService,
})
