import {
  ContainerRegistrationKeys,
  MathBN,
  MedusaError
} from '@medusajs/framework/utils'
import {
  StepResponse,
  WorkflowResponse,
  createStep,
  createWorkflow,
  transform
} from '@medusajs/framework/workflows-sdk'
import {
  addOrderTransactionStep,
  refundPaymentsStep,
  emitEventStep
} from '@medusajs/medusa/core-flows'
import { SplitOrderPaymentWorkflowEvents } from '../../../shared/events/split-order-payment-events'

import { RefundSplitOrderPaymentsDTO } from '../../../modules/split-order-payment/types/mutations'

import orderSplitOrderPayment from '../../../links/order-split-order-payment'

export const selectAndValidatePaymentRefundStep = createStep(
  'select-and-validate-payment-refund-step',
  async function (input: RefundSplitOrderPaymentsDTO, { container }) {

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)


    // First, get the split payment details
    const {
      data: [splitPaymentData]
    } = await query.graph({
      entity: 'split_order_payment',
      fields: ['id', 'payment_collection_id'],
      filters: {
        id: input.id
      }
    })

    if (!splitPaymentData) {
      console.error(`[PARTIAL REFUND] ERROR: Split payment not found: ${input.id}`)
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Split payment with id ${input.id} not found`
      )
    }

    // Now get the order_id from the link
    const {
      // data: [splitPayment]
      data: [linkData]
    } = await query.graph({
      entity: orderSplitOrderPayment.entryPoint,
      // fields: ['*', 'split_order_payment.payment_collection_id'],
      fields: ['order_id', 'split_order_payment_id'],
      filters: {
        split_order_payment_id: input.id
      }
    })

    if (!linkData || !linkData.order_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order ID not found for split payment ${input.id}. Link data: ${JSON.stringify(linkData)}`
      )
    }

    const splitPayment = {
      order_id: linkData.order_id,
      split_order_payment: splitPaymentData
    }

    const {
      data: [payment_collection]
    } = await query.graph({
      entity: 'payment_collection',
      fields: ['id', 'payments.id', 'payment_sessions.payment.*'],
      filters: {
        // id: splitPayment.split_order_payment.payment_collection_id
        id: splitPaymentData.payment_collection_id
      }
    })

    // @TODO if payment_session is deleted, then get provider_id from payment table
    const payment_id = payment_collection?.payment_sessions?.[0]?.payment?.id

    const {
      data: [payment]
    } = await query.graph({
      entity: 'payment',
      fields: [
        'id',
        'currency_code',
        'refunds.id',
        'refunds.amount',
        'captures.id',
        'captures.amount'
      ],
      filters: {
        id: payment_id
        // payment_collection_id: payment_collection.id,
        // deleted_at: {
        //   $eq: null,
        // },
      }
    })

    const capturedAmount = (payment.captures || []).reduce(
      (acc, capture) => MathBN.sum(acc, capture?.amount ?? 0),
      MathBN.convert(0)
    )

    const refundedAmount = (payment.refunds || []).reduce(
      (acc, capture) => MathBN.sum(acc, capture?.amount ?? 0),
      MathBN.convert(0)
    )

    const refundableAmount = MathBN.sub(capturedAmount, refundedAmount)

    if (MathBN.gt(input.amount, refundableAmount)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Payment with id ${payment.id} is trying to refund amount greater than the refundable amount`
      )
    }

    return new StepResponse({
      payment_id: payment.id,
      currency_code: payment.currency_code,
      amount: input.amount,
      order_id: splitPayment.order_id
    })
  }
)

export const partialPaymentRefundWorkflow = createWorkflow(
  {
    name: 'partial-payment-refund'
  },
  function (input: RefundSplitOrderPaymentsDTO) {
    const paymentToRefund = selectAndValidatePaymentRefundStep(input)

    const refundedPayments = refundPaymentsStep(
      transform({ input, paymentToRefund }, ({ input, paymentToRefund }) => {
        return [
          {
            payment_id: paymentToRefund.payment_id,
            amount: input.amount
          }
        ]
      })
    )

    const orderTransaction = transform(
      { paymentToRefund },
      ({ paymentToRefund }) => ({
        order_id: paymentToRefund.order_id,
        amount: MathBN.mult(paymentToRefund.amount, -1),
        currency_code: paymentToRefund.currency_code,
        reference_id: paymentToRefund.payment_id,
        reference: 'refund'
      })
    )

    addOrderTransactionStep(orderTransaction)

    const refundCompletedEvent = transform(
      { paymentToRefund, input },
      ({ paymentToRefund, input }) => ({
        eventName: SplitOrderPaymentWorkflowEvents.REFUND_COMPLETED,
        data: {
          id: paymentToRefund.order_id,
          split_order_payment_id: input.id,
          amount: input.amount
        }
      })
    )

    emitEventStep(refundCompletedEvent)
    return new WorkflowResponse(refundedPayments)
  }
)
