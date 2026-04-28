import { SubscriberConfig } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'
import { SubscriberArgs } from '@medusajs/medusa'
import { capturePaymentWorkflow } from '@medusajs/medusa/core-flows'

import { OrderSetWorkflowEvents } from '../modules/marketplace/types/event'

import { markSplitOrderPaymentsAsCapturedWorkflow } from '../workflows/split-order-payment/workflows'

export default async function orderSetPlacedHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { id: orderSetId } = event.data

  const {
    data: [order_set]
  } = await query.graph({
    entity: 'order_set',
    fields: ['payment_collection_id'],
    filters: {
      id: orderSetId
    }
  })

  if (!order_set) {
    return
  }

  // Check if it's a valid payment_collection ID (should start with pay_col_)
  if (!order_set.payment_collection_id) {
    return
  }

  const {
    data: paymentCollections
  } = await query.graph({
    entity: 'payment_collection',
    fields: ['status', 'payments.*'],
    filters: {
      id: order_set.payment_collection_id
    }
  })

  const payment_collection = paymentCollections?.[0]

  if (!payment_collection) {
    return
  }

  if (!payment_collection.payments || payment_collection.payments.length === 0) {
    return
  }

  // Check if this is a COD payment by checking the payment session provider
  const { data: paymentSessions } = await query.graph({
    entity: 'payment_session',
    fields: ['provider_id', 'status'],
    filters: {
      payment_collection_id: order_set.payment_collection_id
    }
  })

  const isSystemDefault = paymentSessions?.[0]?.provider_id === 'pp_system_default'

  // For COD payments, skip the capture workflow to keep them in "Authorized" status
  if (isSystemDefault) {    
    // For COD, we don't capture the payment - it should remain "Authorized"
    // But we still need to handle split payments appropriately
    // Since COD should remain authorized, split payments should also stay in pending/authorized state
    return
  }

  const payment = payment_collection.payments[0]
  
  // Check if payment is already captured (by webhook or previous process)
  if (payment?.captured_at) {
    console.log(`[PAYMENT-CAPTURE] Payment ${payment?.id} already captured, skipping capture workflow`)
    
    // Still need to mark split payments as captured
    await markSplitOrderPaymentsAsCapturedWorkflow.run({
      container,
      input: order_set.payment_collection_id
    })
    
    return
  }

  // For non-COD payments, proceed with capture workflow only if not already captured
  try {
    const { result } = await capturePaymentWorkflow.run({
      container,
      input: {
        payment_id: payment?.id
      }
    })

    if (!result.captured_at) {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        'Payment failed!'
      )
    }
    
    await markSplitOrderPaymentsAsCapturedWorkflow.run({
      container,
      input: order_set.payment_collection_id
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // If capture fails because payment session was deleted (cart already completed), that's okay
    if (errorMessage.includes('already captured') || 
        errorMessage.includes('PaymentSession') ||
        errorMessage.includes('Payment session or order not found') ||
        errorMessage.includes('already processed/deleted')) {
      console.log(`[PAYMENT-CAPTURE] Payment ${payment?.id} capture skipped (already processed): ${errorMessage}`)
      
      // Still mark split payments as captured
      await markSplitOrderPaymentsAsCapturedWorkflow.run({
        container,
        input: order_set.payment_collection_id
      })
      
      return
    }
    
    // Re-throw other errors
    throw error
  } 
}

export const config: SubscriberConfig = {
  event: OrderSetWorkflowEvents.PLACED,
  context: {
    subscriberId: 'order-set-placed-payment-capture'
  }
}
