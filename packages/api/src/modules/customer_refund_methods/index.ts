import { Module } from "@medusajs/framework/utils"
import CustomerRefundMethodModuleService from "./service"

export const CUSTOMER_REFUND_METHODS_MODULE = "customer_refund_methods"

export default Module(CUSTOMER_REFUND_METHODS_MODULE, {
  service: CustomerRefundMethodModuleService,
})
