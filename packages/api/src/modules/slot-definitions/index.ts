import { Module } from "@medusajs/framework/utils"

import SlotDefinitionModuleService from "./service"

export const SLOT_DEFINITIONS_MODULE = "slot_definitions"

export default Module(SLOT_DEFINITIONS_MODULE, {
  service: SlotDefinitionModuleService,
})
