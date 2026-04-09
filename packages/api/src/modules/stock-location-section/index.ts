import { Module } from "@medusajs/framework/utils"
import StockLocationSectionModuleService from "./service"

export const STOCK_LOCATION_SECTION_MODULE = "stock_location_section"

export default Module(STOCK_LOCATION_SECTION_MODULE, {
  service: StockLocationSectionModuleService,
})
