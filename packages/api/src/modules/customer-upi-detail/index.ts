import { Module } from "@medusajs/framework/utils"
import CustomerUpiModuleService from "./service"

export const CUSTOMER_UPI_MODULE = "customer_upi_detail"

export default Module(CUSTOMER_UPI_MODULE, {
  service: CustomerUpiModuleService,
})
