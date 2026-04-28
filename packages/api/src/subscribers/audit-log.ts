import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { CONFIG_AUDIT_LOGS_MODULE } from '../modules/config-audit-logs'
import ConfigAuditLogModuleService from '../modules/config-audit-logs/service'

type AuditLogEventData = {
  entity_type: string
  entity_id: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  old_entity?: Record<string, unknown>
  new_entity?: Record<string, unknown>
  changed_by?: string | null
  request_id?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Universal audit log subscriber
 * Listens to 'audit.log' event and creates audit log entries
 * Works for all entity types: zone, slot_definition, instant_promise, etc.
 */
export default async function auditLogHandler({
  event,
  container
}: SubscriberArgs<AuditLogEventData>) {
  const auditLogService = container.resolve<ConfigAuditLogModuleService>(CONFIG_AUDIT_LOGS_MODULE)
  
  const { 
    entity_type, 
    entity_id, 
    operation, 
    old_entity, 
    new_entity, 
    changed_by, 
    request_id,
    metadata 
  } = event.data
  
  try {
    await auditLogService.createConfigAuditLogs({
      entity_type,
      entity_id,
      operation,
      old_data: old_entity || null,
      new_data: new_entity || null,
      changed_by: changed_by || null,
      request_id: request_id || null,
      metadata: metadata || {}
    })
  } catch (error) {
    console.error(`Failed to create audit log for ${entity_type}:${entity_id}`, error)
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

export const config: SubscriberConfig = {
  event: 'audit.log'
}

