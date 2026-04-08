import { model } from '@medusajs/framework/utils'

export const Controls = model.define('control', {
  id: model.id({ prefix: 'ctrl' }).primaryKey(),
  scope: model.enum(['zone', 'darkstore']),
  scope_id: model.text(),
  is_instant_enabled: model.boolean().default(true),
  is_slotted_enabled: model.boolean().default(true),
  delay_minutes: model.number().default(0),
  delay_message: model.text().nullable(),
  message_icon: model.text().nullable(),
  reason: model.json().nullable(),
  is_active: model.boolean().default(true),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable()
})

export default Controls
