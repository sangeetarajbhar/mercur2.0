import { Module } from "@medusajs/framework/utils"
import ShopifyProductVariantsModuleService from "./service"

// Module name used for DI and container resolution
export const SHOPIFY_PRODUCT_VARIANTS_MODULE = "shopify_product_variants"

export default Module(SHOPIFY_PRODUCT_VARIANTS_MODULE, {
  service: ShopifyProductVariantsModuleService,
})

