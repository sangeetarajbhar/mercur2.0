import { Module } from "@medusajs/framework/utils"
import CartOrderExtraChargeModuleService from "./service"

export const CART_ORDER_EXTRA_CHARGE_MODULE = "cart_order_extra_charge"

export default Module(CART_ORDER_EXTRA_CHARGE_MODULE, {
  service: CartOrderExtraChargeModuleService,
})
