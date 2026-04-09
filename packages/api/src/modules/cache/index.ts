import { Module } from "@medusajs/framework/utils"
// import CustomCacheModuleService from "./service"
import CacheModuleService from "./service"

export const CACHE_MODULE = "cache"

export default Module(CACHE_MODULE, {
  service: CacheModuleService,
})
