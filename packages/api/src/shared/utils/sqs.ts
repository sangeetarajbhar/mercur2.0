import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

/**
 * SQS message configuration
 */
export interface SQSMessage {
  /**
   * The message body (will be JSON stringified)
   */
  body: Record<string, any>
  /**
   * Optional message attributes for filtering/routing
   */
  attributes?: Record<string, string>
  /**
   * Optional delay in seconds (0-900)
   */
  delaySeconds?: number
}

/**
 * Get AWS SQS configuration from environment variables
 * @returns Configuration object or null if not configured
 */
function getSQSConfig(queueUrl?: string): {
  queueUrl: string
  region: string
  accessKeyId: string
  secretAccessKey: string
} | null {
  const targetQueueUrl = queueUrl 
  const region = process.env.AWS_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!targetQueueUrl || !region || !accessKeyId || !secretAccessKey) {
    return null
  }

  return {
    queueUrl: targetQueueUrl,
    region,
    accessKeyId,
    secretAccessKey
  }
}

/**
 * Convert message attributes to SQS format
 */
function convertAttributesToSQSFormat(
  attributes?: Record<string, string>
): Record<string, any> | undefined {
  if (!attributes || Object.keys(attributes).length === 0) {
    return undefined
  }

  const messageAttributes: Record<string, any> = {}
  Object.entries(attributes).forEach(([key, value]) => {
    messageAttributes[key] = {
      DataType: 'String',
      StringValue: String(value)
    }
  })

  return messageAttributes
}

/**
 * Send a single message to AWS SQS queue
 * @param params - Named parameters
 * @param params.message - The SQS message to send
 * @param params.queueUrl - Optional queue URL override (defaults to AWS_SQS_QUEUE_URL)
 * @returns Promise that resolves when message is sent
 * @throws Error if SQS is not configured or if sending fails
 */
export async function sendSQSMessage(params: {
  message: SQSMessage
  queueUrl?: string
}): Promise<void> {
  const { message, queueUrl } = params
  const config = getSQSConfig(queueUrl)
  if (!config) {
    console.warn('[SQS] Skipping - AWS SQS not configured')
    return
  }

  try {
    const sqsClient = new SQSClient({
      region: config.region,
      ...(process.env.NODE_ENV !== 'production' && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      })
    })

    const messageAttributes = convertAttributesToSQSFormat(message.attributes)

    const command = new SendMessageCommand({
      QueueUrl: config.queueUrl,
      MessageBody: JSON.stringify(message.body),
      MessageAttributes: messageAttributes,
      DelaySeconds: message.delaySeconds
    })

    await sqsClient.send(command)
    console.log('[SQS] Message sent successfully',{
      QueueUrl: config.queueUrl,
      MessageBody: JSON.stringify(message.body),
      MessageAttributes: messageAttributes,
      DelaySeconds: message.delaySeconds
    })
  } catch (error) {
    console.error('[SQS] Failed to send message:', error instanceof Error ? error.message : error)
    throw error
  }
}

/**
 * Send multiple messages to AWS SQS queue in parallel
 * @param params - Named parameters
 * @param params.messages - Array of SQS messages to send
 * @param params.queueUrl - Optional queue URL override (defaults to AWS_SQS_QUEUE_URL)
 * @returns Promise that resolves when all messages are sent
 * @throws Error if SQS is not configured
 */
export async function sendMultipleSQSMessages(params: {
  messages: SQSMessage[]
  queueUrl?: string
}): Promise<void> {
  const { messages, queueUrl } = params
  if (!messages || messages.length === 0) {
    return
  }

  const config = getSQSConfig(queueUrl)
  if (!config) {
    console.warn('[SQS] Skipping - AWS SQS not configured')
    return
  }

  try {
    const sqsClient = new SQSClient({
      region: config.region,
      ...(process.env.NODE_ENV !== 'production' && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      })
    })

    // Send all messages in parallel
    await Promise.all(
      messages.map(async (message, index) => {
        try {
          const messageAttributes = convertAttributesToSQSFormat(message.attributes)

          const command = new SendMessageCommand({
            QueueUrl: config.queueUrl,
            MessageBody: JSON.stringify(message.body),
            MessageAttributes: messageAttributes,
            DelaySeconds: message.delaySeconds
          })

          await sqsClient.send(command)
          console.log('[SQS] Message sent successfully',{
            QueueUrl: config.queueUrl,
            MessageBody: JSON.stringify(message.body),
            MessageAttributes: messageAttributes,
            DelaySeconds: message.delaySeconds
          })
        } catch (error) {
          console.error(
            `[SQS] Failed to send message ${index + 1}:`,
            error instanceof Error ? error.message : error
          )
          // Don't throw - continue with other messages
        }
      })
    )
  } catch (error) {
    console.error('[SQS] Error:', error instanceof Error ? error.message : error)
    throw error
  }
}

