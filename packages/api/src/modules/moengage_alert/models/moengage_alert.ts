import { model } from '@medusajs/framework/utils'

export const moengageAlert = model.define('moengage_alert', {
  id: model.id().primaryKey(),
  alert_id: model.text().unique(),
  alert_name: model.text().unique(),
  is_sms: model.boolean().default(false),
  sms_attributes: model.text().nullable(),
  is_whatsapp: model.boolean().default(false),
  whatsapp_attributes: model.text().nullable(),
  is_email: model.boolean().default(false),
  email_attributes: model.text().nullable(),
  is_push: model.boolean().default(false),
  push_attributes: model.text().nullable(),
  status: model.text().default('1')
})
