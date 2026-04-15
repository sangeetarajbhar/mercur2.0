import { Module } from "@medusajs/framework/utils"
import customerDetailsModuleService from "./service"

export const CUSTOMER_DETAILS_MODULE = "customerDetails"

export default Module(CUSTOMER_DETAILS_MODULE, {
  service: customerDetailsModuleService,
})