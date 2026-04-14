export type CreateMoengageAlertInput = {
  alert_id: string,
  alert_name: string,
  is_sms: boolean,
  sms_attributes?: string | null ,
  is_whatsapp: boolean,
  whatsapp_attributes?: string | null,
  is_email: boolean,
  email_attributes?: string | null,
  is_push: boolean,
  push_attributes?: string | null,
  status: string
}
