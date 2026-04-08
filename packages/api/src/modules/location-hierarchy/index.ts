import { Module } from "@medusajs/framework/utils"
import LocationHierarchyModuleService from "./service"

export const LOCATION_HIERARCHY_MODULE = "location_hierarchy"

export default Module(LOCATION_HIERARCHY_MODULE, {
  service: LocationHierarchyModuleService,
})
