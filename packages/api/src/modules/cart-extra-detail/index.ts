import { Module } from "@medusajs/framework/utils"
import CartExtraDetailModuleService from "./service"

export const CART_EXTRA_DETAIL_MODULE = "cart_extra_detail"

export default Module(CART_EXTRA_DETAIL_MODULE, {
  service: CartExtraDetailModuleService,
})