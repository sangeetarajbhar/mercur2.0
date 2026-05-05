import {
  OrderDTO,
  OrderWorkflow
} from '@medusajs/framework/types'
import {
  MedusaError,
  // OrderStatus
  OrderWorkflowEvents,
  PaymentCollectionStatus,
  deepFlatMap
} from '@medusajs/framework/utils'
import {
  WorkflowData,
  WorkflowResponse,
  createHook,
  createStep,
  createWorkflow,
  parallelize,
  transform,
  when
} from '@medusajs/framework/workflows-sdk'
import {
  emitEventStep,
  useQueryGraphStep,
  updatePaymentCollectionStep,
  cancelPaymentStep,
  // deleteReservationsByLineItemsStep,
  cancelOrdersStep
} from '@medusajs/medusa/core-flows'

import { throwIfOrderIsCancelled } from '../utils/order-validation'
import { createPayoutReversalStep } from '../../payout/steps'
import { refundSplitOrderPaymentWorkflow } from '../../split-order-payment/workflows'
import orderSetOrder from '../../../links/order-set-order'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'
import { restoreSlotCapacityStep } from '../steps/restore-slot-capacity'
import { updateOrderChangeCanceledByStep } from '../steps/update-order-change-canceled-by'

/**
 * The data to validate the order's cancelation.
 */
export type CancelValidateOrderStepInput = {
  /**
   * The order to cancel.
   */
  order: OrderDTO
  /**
   * The cancelation details.
   */
  input: OrderWorkflow.CancelOrderWorkflowInput
}

/**
 * This step validates that an order can be canceled.
 * Throws if the order was already canceled.
 *
 * Note: rider-assigned guard is intentionally not checked here.
 * It is enforced at the order-group level before any cancellation begins.
 */
export const cancelValidateOrder = createStep(
  'cancel-validate-order',
  ({ order }: CancelValidateOrderStepInput) => {
    throwIfOrderIsCancelled({ order })
  }
)

export const cancelOrderWorkflowId = 'cancel-single-order'

export type CancelOrderWorkflowInput = OrderWorkflow.CancelOrderWorkflowInput & {
  isRTO?: boolean
  /**
   * When set, order.canceled event includes this so subscribers (e.g. SQS) can skip
   * SQS for specific cancel reasons (like payment failure or payment pending).
   */
  cancel_reason?: 'payment_failure' | 'payment_pending'
}

export const cancelOrderWorkflow = createWorkflow(
  cancelOrderWorkflowId,
  (input: WorkflowData<CancelOrderWorkflowInput>) => {

    const orderQuery = useQueryGraphStep({
      entity: 'orders',
      fields: [
        'id',
        'status',
        'currency_code',
        'items.id',
        'payment_collections.id',
        'payment_collections.payments.id',
        'payment_collections.payments.amount',
        'payment_collections.payments.refunds.id',
        'payment_collections.payments.refunds.amount',
        'payment_collections.payments.captures.id',
        'payment_collections.payments.captures.amount',
        'split_order_payment.*',
        'payouts.*'
      ],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true }
    }).config({ name: 'get-cart' })

    const order = transform(
      { orderQuery } as any,
      ({ orderQuery }) => orderQuery.data[0]
    )

    // Query order set link with nested order_set fields (used for payment collection logic)
    const orderSetLinkQuery = useQueryGraphStep({
      entity: orderSetOrder.entryPoint,
      fields: [
        'order_set_id',
        'order_id',
        'order_set.id',
        'order_set.status'
      ],
      filters: {
        order_id: input.order_id
      }
    }).config({ name: 'get-order-set-link' })

    cancelValidateOrder({ order, input })

    const uncapturedPaymentIds = transform({ order }, ({ order }) => {
      const payments = deepFlatMap(
        order,
        'payment_collections.payments',
        ({ payments }) => payments
      )

      const uncapturedPayments = payments.filter(
        (payment) => payment.captures.length === 0
      )

      return uncapturedPayments.map((payment) => payment.id)
    })

    // const lineItemIds = transform({ order }, ({ order }) => {
    //   return order.items?.map((i) => i.id)
    // })

    const payoutId = transform({ order }, ({ order }) => {
      return order.payouts && order.payouts[0] ? order.payouts[0].id : null
    })

    const cancelEventData = transform(
      { order, input, orderSetLinkQuery },
      ({ order, input, orderSetLinkQuery }) => {
        // Determine cancel reason:
        // 1. If provided explicitly in input, use that (e.g. payment_failure).
        // 2. Otherwise, infer from order-set status (e.g. PAYMENT_PENDING).
        let cancelReason = input?.cancel_reason

        if (!cancelReason) {
          const link = orderSetLinkQuery.data?.[0]
          const status = link?.order_set?.status?.toUpperCase?.()
          if (status === OrderLineItemStatus.PAYMENT_PENDING) {
            cancelReason = 'payment_pending'
          }
        }

        return {
          eventName: OrderWorkflowEvents.CANCELED,
          data: {
            id: order.id,
            isRTO: input?.isRTO === true,
            cancel_reason: cancelReason
          }
        }
      }
    )

    // Core cancellation steps
    parallelize(
      // deleteReservationsByLineItemsStep(lineItemIds),
      cancelPaymentStep({ paymentIds: uncapturedPaymentIds }),
      emitEventStep(cancelEventData),
      // Restore slot capacity for slotted deliveries
      restoreSlotCapacityStep({ order_id: order.id })
    )

    // Handle split payment refund and payout reversal if split payment exists.
    // Only refund the remaining refundable amount (captured - already refunded), e.g. after partial refunds from item-level cancellation.
    // For COD orders, captured_amount is 0 and should not be refunded.
    const refundCondition = transform({ order }, ({ order }) => {
      const hasPayment = !!order.split_order_payment?.id
      const capturedAmount = order.split_order_payment?.captured_amount ?? 0
      const refundedAmount = order.split_order_payment?.refunded_amount ?? 0
      const refundableAmount = Number(capturedAmount) - Number(refundedAmount)
      const shouldRefund = hasPayment && refundableAmount > 0
      return {
        shouldRefund,
        hasPayment,
        splitPaymentId: order.split_order_payment?.id,
        refundableAmount
      }
    })

    when({ refundCondition }, ({ refundCondition }) => refundCondition.shouldRefund).then(() => {
      parallelize(
        refundSplitOrderPaymentWorkflow.runAsStep({
          input: {
            id: refundCondition.splitPaymentId,
            amount: refundCondition.refundableAmount
          }
        }),
        createPayoutReversalStep({
          payout_id: payoutId,
          amount: refundCondition.refundableAmount,
          currency_code: order.currency_code
        })
      )
    })

    // Reuse orderSetLinkQuery that was already queried earlier for validation

    // Query all orders in the order set (will be empty if not part of order set)
    const orderSetOrdersQuery = useQueryGraphStep({
      entity: orderSetOrder.entryPoint,
      fields: ['order_id', 'order.id', 'order.status', 'order_set_id'],
      filters: {
        order_set_id: transform(
          { orderSetLinkQuery },
          ({ orderSetLinkQuery }) => orderSetLinkQuery.data?.[0]?.order_set_id || 'non-existent'
        )
      }
    }).config({ name: 'get-order-set-orders' })

    const paymentCollectionUpdateData = transform(
      { order, orderSetLinkQuery, orderSetOrdersQuery },
      ({ order, orderSetLinkQuery, orderSetOrdersQuery }) => {
        const paymentCollectionIds = order.payment_collections?.map((pc) => pc.id) || []
        
        // Check if this order is part of an order set
        const orderSetLink = orderSetLinkQuery.data?.[0]
        
        if (!orderSetLink || !orderSetLink.order_set_id) {
          // Not part of an order set, mark as canceled
          return {
            ids: paymentCollectionIds,
            shouldUpdate: paymentCollectionIds.length > 0,
            status: PaymentCollectionStatus.CANCELED
          }
        }

        // Get all orders in the order set
        const allOrdersInSet = orderSetOrdersQuery.data || []
        
        // Count how many orders are already canceled (excluding current one)
        const otherOrders = allOrdersInSet.filter((link) => link.order_id !== order.id)
        const allOthersCanceled = otherOrders.length > 0 && otherOrders.every(
          (link) => link.order?.status === 'canceled'
        )
        
        // Only update payment collection status if ALL other orders are canceled
        return {
          ids: paymentCollectionIds,
          shouldUpdate: allOthersCanceled && paymentCollectionIds.length > 0,
          status: PaymentCollectionStatus.CANCELED
        }
      }
    )

    when({ paymentCollectionUpdateData }, ({ paymentCollectionUpdateData }) => {
      return paymentCollectionUpdateData.shouldUpdate
    }).then(() => {
      updatePaymentCollectionStep({
        selector: { id: paymentCollectionUpdateData.ids },
        update: { status: paymentCollectionUpdateData.status }
      })
    })

    // Log before calling cancelOrdersStep
    const cancelStepInput = transform({ order, input }, ({ order, input }) => {
      const stepInput = {
        orderIds: [order.id],
        canceled_by: input.canceled_by
      }
      return stepInput
    })

    cancelOrdersStep(cancelStepInput)

    // Update order_change records with canceled_by after cancellation
    updateOrderChangeCanceledByStep({
      orderId: order.id,
      canceledBy: input.canceled_by
    })

    const orderCanceled = createHook('orderCanceled', {
      order
    })

    return new WorkflowResponse(void 0, {
      hooks: [orderCanceled]
    })
  }
)
