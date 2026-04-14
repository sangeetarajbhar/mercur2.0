import { Module } from "@medusajs/framework/utils"
import ProductConfigurationService, { ProductConfigurationInput } from "./service"

export { ProductConfigurationInput }

export const PRODUCT_CONFIGURATION_MODULE = "product_configuration"

export default Module(PRODUCT_CONFIGURATION_MODULE, {
  service: ProductConfigurationService
})