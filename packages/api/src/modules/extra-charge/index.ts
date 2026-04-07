import { Module } from "@medusajs/framework/utils"
import ExtraChargeService from "./service"

export const EXTRA_CHARGE_MODULE = "extra_charge"

export default Module(EXTRA_CHARGE_MODULE, {
  service: ExtraChargeService,
})
