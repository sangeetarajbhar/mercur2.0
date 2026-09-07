import { Module } from '@medusajs/framework/utils'

import ConfigAuditLogModuleService from './service'

export const CONFIG_AUDIT_LOGS_MODULE = 'config_audit_logs'

export default Module(CONFIG_AUDIT_LOGS_MODULE, {
  service: ConfigAuditLogModuleService
})
