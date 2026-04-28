import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { Modules, PaymentEvents } from '@medusajs/framework/utils'

import { markSplitOrderPaymentsAsCapturedWorkflow } from '../workflows/split-order-payment/workflows'

export default async function paymentCapturedHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const payment_id = event.data.id
  const paymentService = container.resolve(Modules.PAYMENT)

  try {
    const payment = await paymentService.retrievePayment(payment_id, {
      relations: ['payment_collection']
    })

    if (!payment.payment_collection_id) {
      console.log(`[Split Payment] Payment ${payment_id} has no payment_collection_id, skipping`)
      return
    }

    await markSplitOrderPaymentsAsCapturedWorkflow.run({
      container,
      input: payment.payment_collection_id
    })
  } catch (error) {
    // Payment not found - this can happen if the payment was already processed or deleted
    if (error && typeof error === 'object' && 'type' in error && error.type === 'not_found') {
      console.log(`[Split Payment] Payment ${payment_id} not found, skipping capture handler`)
      return
    }
    // Re-throw other errors
    throw error
  }
}

export const config: SubscriberConfig = {
  event: PaymentEvents.CAPTURED,
  context: {
    subscriberId: 'split-payment-payment-captured-handler'
  }
}
