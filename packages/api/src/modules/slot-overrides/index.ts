import { Module } from "@medusajs/framework/utils"

import SlotOverrideModuleService from "./service"

export const SLOT_OVERRIDES_MODULE = "slot_overrides"

export default Module(SLOT_OVERRIDES_MODULE, {
  service: SlotOverrideModuleService,
})
