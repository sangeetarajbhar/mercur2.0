import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import S3FileNoAclService from "./service"

export default ModuleProvider(Modules.FILE, {
  services: [S3FileNoAclService],
})