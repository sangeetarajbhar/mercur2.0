import { Module } from "@medusajs/framework/utils"
import StockLocationExtensionModuleService from "./service"

export const STOCK_LOCATION_EXTENSION_MODULE = "stock_location_extension"

export default Module(STOCK_LOCATION_EXTENSION_MODULE, {
  service: StockLocationExtensionModuleService,
})
