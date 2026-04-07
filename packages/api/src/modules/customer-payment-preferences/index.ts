import { Module } from "@medusajs/framework/utils"
import CustomerPaymentPreferencesModuleService from "./service"

export const CUSTOMER_PAYMENT_PREFERENCES_MODULE = "customer_payment_preferences"

export default Module(CUSTOMER_PAYMENT_PREFERENCES_MODULE, {
  service: CustomerPaymentPreferencesModuleService,
})
