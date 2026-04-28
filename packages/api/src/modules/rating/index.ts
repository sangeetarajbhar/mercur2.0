import { Module } from "@medusajs/framework/utils"
import RatingModuleService from "./service"

export const RATING_MODULE = "rating"

export default Module(RATING_MODULE, {
  service: RatingModuleService,
})

