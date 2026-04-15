import { Module } from "@medusajs/framework/utils"
import OrderExtraDetailModuleService from "./service"

export const ORDER_EXTRA_DETAIL_MODULE = "order_extra_detail"

export default Module(ORDER_EXTRA_DETAIL_MODULE, {
  service: OrderExtraDetailModuleService,
})
