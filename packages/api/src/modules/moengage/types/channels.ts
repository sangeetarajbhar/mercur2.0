export enum MoEngageChannels {
  SMS = 'sms_moengage',
  WHATSAPP = 'whatsapp_moengage',
  EMAIL = 'email_moengage',
  PUSH = 'push_moengage'
}


export const moengageChannelMapping: Record<string, string> = {
  [MoEngageChannels.SMS]: 'SMS',
  [MoEngageChannels.WHATSAPP]: 'WHATSAPP',
  [MoEngageChannels.EMAIL]: 'EMAIL',
  [MoEngageChannels.PUSH]: 'PUSH',
}
