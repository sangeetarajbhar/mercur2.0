import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { MoEngageChannels } from '../../modules/moengage/types/channels'
import { MoEngageAlertName } from '../../shared/utils/moEngageAlertName'

export interface NotificationRecipient {
  phone?: string
  email?: string
  emailBcc?: string[] // Array of BCC email addresses
  deviceTokenId?: string
}

export interface NotificationData {
  [key: string]: any
}

export interface MoEngageNotificationConfig {
  alertName: MoEngageAlertName
  recipient: NotificationRecipient
  data: NotificationData
}

export class MoEngageNotificationService {
  private container: MedusaContainer
  private notificationService: any
  private knex: any

  constructor(container: MedusaContainer) {
    this.container = container
    this.notificationService = container.resolve(Modules.NOTIFICATION)
    this.knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  }

  /**
   * Send notifications via MoEngage based on alert configuration
   * This method handles SMS, WhatsApp, Email, and Push notifications automatically
   */
  async sendNotifications(config: MoEngageNotificationConfig): Promise<void> {
    const { alertName, recipient, data } = config

    // Fetch MoEngage alert configuration from database
    const moengageAlert = await this.getMoEngageAlert(alertName)
    
    if (!moengageAlert) {
      console.warn(`MoEngage alert configuration not found for: ${alertName}`)
      return
    }

    // Prepare notification promises for parallel execution
    const notificationPromises: Promise<void>[] = []

    // Send SMS notification if enabled and phone is available
    if (moengageAlert.is_sms && recipient.phone) {
      const phoneWithCountryCode = this.formatPhoneNumber(recipient.phone)
      notificationPromises.push(
        this.sendSMSNotification(moengageAlert, phoneWithCountryCode, data)
      )
    }

    // Send WhatsApp notification if enabled and phone is available
    if (moengageAlert.is_whatsapp && recipient.phone) {
      const phoneWithCountryCode = this.formatPhoneNumber(recipient.phone)
      notificationPromises.push(
        this.sendWhatsAppNotification(moengageAlert, phoneWithCountryCode, data)
      )
    }

    // Send Email notification if enabled and email is available
    // Only trigger email if it does NOT start with a mobile number + "@"
    if (
      moengageAlert.is_email &&
      recipient.email &&
      !/^\d{10}@/.test(recipient.email)
    ) {
      notificationPromises.push(
        this.sendEmailNotification(moengageAlert, recipient.email, data)
      )
      
      // Send BCC emails if provided
      if (recipient.emailBcc && Array.isArray(recipient.emailBcc)) {
        recipient.emailBcc.forEach((bccEmail) => {
          if (bccEmail && !/^\d{10}@/.test(bccEmail)) {
            notificationPromises.push(
              this.sendEmailNotification(moengageAlert, bccEmail, data)
            )
          }
        })
      }
    }

    // Send Push notification if enabled and deviceTokenId is available
    if (moengageAlert.is_push && recipient.deviceTokenId) {
      notificationPromises.push(
        this.sendPushNotification(moengageAlert, recipient.deviceTokenId, data)
      )
    }

    // Execute all notifications in parallel
    try {
      await Promise.all(notificationPromises)
    } catch (error) {
      console.error(`Error sending MoEngage notifications for ${alertName}:`, error)
      throw error
    }
  }

  /**
   * Get MoEngage alert configuration from database
   */
  private async getMoEngageAlert(alertName: MoEngageAlertName) {
    return await this.knex('moengage_alert')
      .select(
        'id',
        'alert_id',
        'alert_name',
        'is_sms',
        'sms_attributes',
        'is_whatsapp',
        'whatsapp_attributes',
        'is_email',
        'email_attributes',
        'is_push',
        'push_attributes',
        'status'
      )
      .where('alert_name', alertName)
      .where('status', 1)
      .whereNull('deleted_at')
      .first()
  }

  /**
   * Format phone number with +91 country code
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any existing country code prefix
    const cleanPhone = phone.replace(/^\+?91/, '')
    return `91${cleanPhone}`
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    moengageAlert: any,
    phone: string,
    data: NotificationData
  ): Promise<void> {
    await this.notificationService.createNotifications({
      to: phone,
      channel: MoEngageChannels.SMS,
      template: moengageAlert.alert_name,
      trigger_type: moengageAlert.alert_name,
      receiver_id: phone,
      data: {
        alert_id: moengageAlert.alert_id,
        alert_reference_name: moengageAlert.alert_name,
        data: data,
      }
    })
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsAppNotification(
    moengageAlert: any,
    phone: string,
    data: NotificationData
  ): Promise<void> {
    await this.notificationService.createNotifications({
      to: phone,
      channel: MoEngageChannels.WHATSAPP,
      template: moengageAlert.alert_name,
      trigger_type: moengageAlert.alert_name,
      receiver_id: phone,
      data: {
        alert_id: moengageAlert.alert_id,
        alert_reference_name: moengageAlert.alert_name,
        data: data,
      }
    })
  }

  /**
   * Send Email notification
   */
  private async sendEmailNotification(
    moengageAlert: any,
    email: string,
    data: NotificationData
  ): Promise<void> {
    await this.notificationService.createNotifications({
      to: email,
      channel: MoEngageChannels.EMAIL,
      template: moengageAlert.alert_name,
      trigger_type: moengageAlert.alert_name,
      receiver_id: email,
      data: {
        alert_id: moengageAlert.alert_id,
        alert_reference_name: moengageAlert.alert_name,
        data: data,
      }
    })
  }

  /**
   * Send Push notification
   */
  private async sendPushNotification(
    moengageAlert: any,
    deviceTokenId: string,
    data: NotificationData
  ): Promise<void> {
    await this.notificationService.createNotifications({
      to: deviceTokenId,
      channel: MoEngageChannels.PUSH,
      template: moengageAlert.alert_name,
      trigger_type: moengageAlert.alert_name,
      receiver_id: deviceTokenId,
      user_id: deviceTokenId,
      data: {
        alert_id: moengageAlert.alert_id,
        alert_reference_name: moengageAlert.alert_name,
        data: data,
      }
    })
  }

}

/**
 * Factory function to create MoEngageNotificationService instance
 */
export function createMoEngageNotificationService(container: MedusaContainer): MoEngageNotificationService {
  return new MoEngageNotificationService(container)
}
