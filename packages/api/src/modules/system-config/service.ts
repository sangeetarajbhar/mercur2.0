import { MedusaService } from "@medusajs/framework/utils"
import { SystemConfig } from "./models/system-config"

class SystemConfigModuleService extends MedusaService({
  SystemConfig,
}) {}

export default SystemConfigModuleService

