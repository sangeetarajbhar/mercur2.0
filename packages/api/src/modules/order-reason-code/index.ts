import { Module } from "@medusajs/framework/utils"
import OrderReasonCodeModuleService from "./service"

export const ORDER_REASON_CODE_MODULE = "order_reason_code"

export default Module(ORDER_REASON_CODE_MODULE, {
  service: OrderReasonCodeModuleService,
})
