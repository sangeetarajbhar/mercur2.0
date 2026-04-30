import { Module } from "@medusajs/framework/utils"
import ReturnExtensionModuleService from "./service"

export const RETURN_EXTENSION_MODULE = "return_extension"

export default Module(RETURN_EXTENSION_MODULE, {
  service: ReturnExtensionModuleService,
})
