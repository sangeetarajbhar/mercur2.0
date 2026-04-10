import PromotionModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PROMOTION_MODULE = "promotion_extension"

export default Module(PROMOTION_MODULE, {
  service: PromotionModuleService,
})

