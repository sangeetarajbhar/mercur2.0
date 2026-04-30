import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { sendMultipleSQSMessages, SQSMessage } from '../../../shared/utils/sqs'

/**
 * Generic input for sending messages to SQS
 */
type SendToSQSInput = {
  /**
   * Array of messages to send to SQS
   */
  messages: SQSMessage[]
  /**
   * Optional queue URL override
   * If not provided, defaults to AWS_SQS_QUEUE_URL env var
   * Common usage: AWS_SQS_ORDER_QUEUE_URL, AWS_SQS_SHIPMENT_QUEUE_URL
   */
  queueUrl?: string
}

/**
 * Reusable step to send messages to AWS SQS queue
 * 
 * @example
 * // Send order creation message
 * sendToSQSStep({
 *   messages: [{
 *     body: { operation: 'createOrder', marketplaceOrderId: 'ord_123' },
 *     attributes: { operation: 'createOrder' }
 *   }]
 * })
 * 
 * @example
 * // Send delivery notification
 * sendToSQSStep({
 *   messages: [{
 *     body: { operation: 'orderDelivered', orderId: 'ord_123', deliveredAt: '2024-01-01' },
 *     attributes: { operation: 'orderDelivered', priority: 'high' },
 *     delaySeconds: 60
 *   }]
 * })
 */
export const sendToSQSStep = createStep(
  {
    name: 'send-to-sqs'
  },
  async (input: SendToSQSInput, { container }): Promise<StepResponse<void, void>> => {
    const { messages, queueUrl: customQueueUrl } = input

    try {
      // Use shared utility to send messages
      await sendMultipleSQSMessages({
        messages,
        queueUrl: customQueueUrl
      })
      return new StepResponse(undefined, undefined)
    } catch (error) {
      // Errors are already logged in the utility function
      // Return success to avoid breaking the workflow
      return new StepResponse(undefined, undefined)
    }
  }
)

