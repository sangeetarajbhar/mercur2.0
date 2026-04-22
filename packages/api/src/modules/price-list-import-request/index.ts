import { Module } from "@medusajs/framework/utils"
import PriceListImportRequestModuleService from "./service"

export const PRICE_LIST_IMPORT_REQUEST_MODULE = "price_list_import_request"
export { PriceListImportRequestModuleService }

export default Module(PRICE_LIST_IMPORT_REQUEST_MODULE, {
  service: PriceListImportRequestModuleService,
})
