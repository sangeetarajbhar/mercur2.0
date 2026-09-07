import { Module } from "@medusajs/framework/utils"

import ZoneModuleService from "./service"

export const ZONE_MODULE = "zone"

export default Module(ZONE_MODULE, {
  service: ZoneModuleService,
})
