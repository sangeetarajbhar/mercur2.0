import { model } from '@medusajs/framework/utils'

export const ConfigAuditLogs = model.define('config_audit_log', {
  id: model.id({ prefix: 'cal' }).primaryKey(),
  entity_type: model.text(),
  entity_id: model.text(),
  operation: model.text(),
  old_data: model.json().nullable(),
  new_data: model.json().nullable(),
  changed_by: model.text().nullable(),
  request_id: model.text().nullable(),
  metadata: model.json().default({})
})

export default ConfigAuditLogs
