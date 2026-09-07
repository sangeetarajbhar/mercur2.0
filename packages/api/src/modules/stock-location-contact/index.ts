import { Module } from "@medusajs/framework/utils"
import StockLocationContactModuleService from "./service"

export const STOCK_LOCATION_CONTACT_MODULE = "stock_location_contact"

export default Module(STOCK_LOCATION_CONTACT_MODULE, {
  service: StockLocationContactModuleService,
})
