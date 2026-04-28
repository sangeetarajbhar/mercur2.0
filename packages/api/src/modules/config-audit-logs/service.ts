import { MedusaService } from "@medusajs/framework/utils"
import { ConfigAuditLogs } from "./models/config_audit_log"

class ConfigAuditLogModuleService extends MedusaService({
  ConfigAuditLogs
}) {
  // You can add custom methods here if needed
}

export default ConfigAuditLogModuleService
