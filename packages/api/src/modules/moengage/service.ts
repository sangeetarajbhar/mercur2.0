import {AbstractNotificationProviderService, MedusaError} from '@medusajs/framework/utils'
import axios from 'axios'
import { randomUUID } from 'crypto'
import {moengageChannelMapping, MoEngageChannels} from './types/channels'
import { ProviderSendNotificationDTO } from '@mercurjs/types'

type MoEngageOptions = {
  workspace_id: string
  inform_api_key: string
  base_url: string
}

type MoEngagePayload = {
  alert_id?: string
  alert_reference_name?: string
  user_id?: string
  transaction_id: string
  payloads: {
    [key in MoEngageChannels]?: {
      // `recipient` is optional because for PUSH notifications
      // MoEngage should not receive this field in the payload.
      recipient?: string
      personalized_attributes?: Record<string, string | number | boolean>
      attachments?: Array<{
        file_name: string
        file_content: string
      }>
    }
  }
}

interface NotificationData {
  data?: Record<string, string | number | boolean>
  user_id?: string
  attachments?: Array<{
    file_name: string
    file_content: string
  }>
  provider?: string
  alert_id?: string
  alert_reference_name?: string
}

class MoEngageNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = 'notification-moengage'
  private options: MoEngageOptions

  constructor(_, options: MoEngageOptions) {
    super()
    this.validateModuleOptions(options)
    this.options = options
  }

  validateModuleOptions(options: MoEngageOptions) {
    const requiredFields = ['workspace_id', 'inform_api_key', 'base_url']

    for (const field of requiredFields) {
      if (!options[field]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `No ${field} was provided in the ${MoEngageNotificationProviderService.identifier} options. Please add one.`
        )
      }
    }
  }

  private getAuthHeader(): string {
    // Create Basic Auth header using workspace_id and inform_api_key
    return Buffer.from(`${this.options.workspace_id}:${this.options.inform_api_key}`).toString('base64')
  }

  private getTransactionId(): string {
    // Generate a unique transaction ID using UUID to prevent duplicates
    // UUID guarantees uniqueness even when multiple notifications are sent simultaneously
    return randomUUID()
  }

  async send(notification: ProviderSendNotificationDTO) {
    try {
      // Extract channel from notification or default to EMAIL
      const channel = notification.channel as MoEngageChannels
      const channelName = moengageChannelMapping[channel]

      // Get recipient
      const recipient = notification.to

      if (!recipient) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `No recipient provided for ${channelName} notification and no default configured.`
        )
      }

      
      // Parse notification data with proper typing
      const notificationData = notification.data as NotificationData

      // Prepare personalized attributes from notification data
      const personalizedAttributes = notificationData.data || {}

      const isPushChannel = channel === MoEngageChannels.PUSH

      // Create MoEngage payload
      const payload: MoEngagePayload = {
        alert_id: notificationData.alert_id,
        alert_reference_name: notificationData.alert_reference_name,
        transaction_id: this.getTransactionId(),
        payloads: {}
      }

      // Add user_id:
      // - For PUSH: use the device token (notification.to / recipient) as user_id
      // - For other channels: fallback to explicit user_id from notification data (existing behavior)
      if (isPushChannel) {
        payload.user_id = recipient
      } else if (notificationData.user_id) {
        payload.user_id = notificationData.user_id
      }
      // Previous behavior (kept for reference):
      // if (notificationData.user_id) {
      //   payload.user_id = notificationData.user_id
      // }

      // Add channel-specific payload
      payload.payloads[channelName] = {
        // For PUSH notifications, we must NOT send `recipient` in the payload.
        ...(isPushChannel ? {} : { recipient }),
        personalized_attributes: personalizedAttributes as Record<string, string | number | boolean>
      }

      // Add attachments if available
      // if (notificationData.attachments) {
      //   payload.payloads[channelName].attachments = notificationData.attachments
      // }

      // console.log('payload', payload)
      // Send request to MoEngage API
      const response = await axios.post(
        `${this.options.base_url}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'MOE-APPKEY': this.options.workspace_id,
            'Authorization': this.getAuthHeader()
          }
        }
      )

      // Check for successful response
      if (response.status !== 200) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `MoEngage API returned status ${response.status}: ${JSON.stringify(response.data)}`
        )
      }

      return response.data
    } catch (error) {
      console.error('Error sending MoEngage notification: ', error)
      if (axios.isAxiosError(error)) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `MoEngage API error: ${error.response?.data?.message || error.message}`
        )
      }

      throw error
    }
  }
}

export default MoEngageNotificationProviderService
