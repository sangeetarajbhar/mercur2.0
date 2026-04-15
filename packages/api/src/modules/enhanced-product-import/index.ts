import { Module } from "@medusajs/framework/utils"
import EnhancedProductImportService from "./services/enhanced-product-import.service"

export const ENHANCED_PRODUCT_IMPORT_MODULE = "enhancedProductImport"

export default Module(ENHANCED_PRODUCT_IMPORT_MODULE, {
  service: EnhancedProductImportService,
})