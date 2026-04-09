import { Module } from "@medusajs/framework/utils"
import StockLocationDocumentModuleService from "./service"

export const STOCK_LOCATION_DOCUMENT_MODULE = "stock_location_document"

export default Module(STOCK_LOCATION_DOCUMENT_MODULE, {
  service: StockLocationDocumentModuleService,
})
