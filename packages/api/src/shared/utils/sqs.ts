import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

export interface SQSMessage {
  body: Record<string, any>
  attributes?: Record<string, string>
  delaySeconds?: number
}

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
  return { queueUrl: targetQueueUrl, region, accessKeyId, secretAccessKey }
}

function convertAttributesToSQSFormat(
  attributes?: Record<string, string>
): Record<string, any> | undefined {
  if (!attributes || Object.keys(attributes).length === 0) return undefined
  const messageAttributes: Record<string, any> = {}
  Object.entries(attributes).forEach(([key, value]) => {
    messageAttributes[key] = { DataType: 'String', StringValue: String(value) }
  })
  return messageAttributes
}

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
  const sqsClient = new SQSClient({
    region: config.region,
    ...(process.env.NODE_ENV !== 'production' && {
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
  })

  const command = new SendMessageCommand({
    QueueUrl: config.queueUrl,
    MessageBody: JSON.stringify(message.body),
    MessageAttributes: convertAttributesToSQSFormat(message.attributes),
    DelaySeconds: message.delaySeconds
  })
  await sqsClient.send(command)
}

