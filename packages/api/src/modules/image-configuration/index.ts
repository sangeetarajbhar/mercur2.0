import { Module } from "@medusajs/framework/utils"
import ImageConfigurationModuleService from "./service"

export const IMAGE_CONFIGURATION_MODULE = "image_configuration"

export default Module(IMAGE_CONFIGURATION_MODULE, {
  service: ImageConfigurationModuleService,
})
