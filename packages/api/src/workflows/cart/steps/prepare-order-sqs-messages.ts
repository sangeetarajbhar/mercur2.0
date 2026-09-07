import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { SQSMessage } from '../../../shared/utils/sqs'

/**
 * Order extra detail structure with marketplace_order_id
 */
type OrderExtraDetail = {
  id: string
  order_id: string
  marketplace_order_id: string
}

/**
 * Input for preparing SQS messages from order extra details
 */
type PrepareOrderSQSMessagesInput = {
  /**
   * Array of order extra details containing marketplace_order_id
   */
  orderExtraDetails: OrderExtraDetail[]
}

/**
 * Step to prepare SQS messages from order extra details
 * This step transforms order extra details into the format required for SQS
 *
 * @example
 * const sqsMessages = prepareOrderSQSMessagesStep({
 *   orderExtraDetails: [
 *     { id: '1', order_id: 'ord_123', marketplace_order_id: 'mkt_123' }
 *   ]
 * })
 */
export const prepareOrderSQSMessagesStep = createStep(
  'prepare-order-sqs-messages',
  async (
    input: PrepareOrderSQSMessagesInput
  ): Promise<StepResponse<SQSMessage[], void>> => {
    const { orderExtraDetails } = input

    if (!orderExtraDetails || orderExtraDetails.length === 0) {
      return new StepResponse([], undefined)
    }

    const sqsMessages: SQSMessage[] = orderExtraDetails.map((detail) => ({
      body: {
        operation: 'createOrder',
        marketplaceOrderId: detail.marketplace_order_id,
      } as Record<string, unknown>,
      attributes: {
        operation: 'createOrder',
        marketplaceOrderId: detail.marketplace_order_id,
      } as Record<string, string>,
    }))

    return new StepResponse(sqsMessages, undefined)
  }
)
