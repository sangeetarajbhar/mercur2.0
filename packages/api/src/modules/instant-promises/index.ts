import { Module } from "@medusajs/framework/utils"

import InstantPromiseModuleService from "./service"

export const INSTANT_PROMISES_MODULE = "instant_promises"

export default Module(INSTANT_PROMISES_MODULE, {
  service: InstantPromiseModuleService,
})
