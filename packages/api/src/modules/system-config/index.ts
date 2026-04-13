import { Module } from "@medusajs/framework/utils"
import SystemConfigModuleService from "./service"

export const SYSTEM_CONFIG_SECTION_MODULE = "system_config"

export default Module(SYSTEM_CONFIG_SECTION_MODULE, {
  service: SystemConfigModuleService,
})

