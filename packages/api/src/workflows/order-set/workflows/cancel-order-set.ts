import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
  when,
} from '@medusajs/framework/workflows-sdk'
import {
  useQueryGraphStep,
  emitEventStep,
} from '@medusajs/medusa/core-flows'

import orderSetOrder from '../../../links/order-set-order'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'
import { validateOrderSetCancellationStep } from '../steps'
import {
  executeCancelOrderWorkflowsStep,
  deleteReservationsForOrdersStep,
} from '../../order/steps'

export type CancelOrderSetWorkflowInput = {
  order_set_id: string
  canceled_by: string
}

export const cancelOrderSetWorkflowId = 'cancel-order-set'

/**
 * This workflow cancels an order-set by:
 * 1. Validating that the order set can be canceled (not already cancelled)
 * 2. Getting all orders in the order set
 * 3. Running cancelOrderWorkflow sequentially for all orders (which emits order.canceled events)
 * 4. Emitting "order-set-cancelled" event
 *
 * Note: rider-assigned and RFR guards are not checked here — both are enforced at the
 * order-group level before any order-set cancellation begins.
 * Line items, orders, and order-set are all updated by the order.canceled event subscribers.
 * Sequential execution ensures the last order's subscriber will see all orders as cancelled
 * and automatically update the order-set status.
 */
export const cancelOrderSetWorkflow = createWorkflow(
  cancelOrderSetWorkflowId,
  (input: WorkflowData<CancelOrderSetWorkflowInput>) => {
    const orderSetQuery = useQueryGraphStep({
      entity: 'order_set',
      fields: ['id', 'status'],
      filters: { id: input.order_set_id },
      options: { throwIfKeyNotFound: true }
    }).config({ name: 'get-order-set' })

    const orderSet = transform(
      { orderSetQuery } as any,
      ({ orderSetQuery }) => orderSetQuery.data[0]
    )

    const orderSetOrdersQuery = useQueryGraphStep({
      entity: orderSetOrder.entryPoint,
      fields: ['order_id', 'order.id', 'order.status'],
      filters: { order_set_id: input.order_set_id }
    }).config({ name: 'get-order-set-orders' })

    // Validate that the order-set is not already cancelled
    validateOrderSetCancellationStep({ orderSet })

    const ordersData = transform(
      { orderSetOrdersQuery },
      ({ orderSetOrdersQuery }) => {
        const links = orderSetOrdersQuery.data || []
        const orderIds = links
          .filter((link: any) => {
            const status = link.order?.status?.toUpperCase?.()
            return status !== OrderLineItemStatus.CANCELLED && status !== 'CANCELED'
          })
          .map((link: any) => link.order_id)
        return { orderIds }
      }
    )

    executeCancelOrderWorkflowsStep({
      orderIds: ordersData.orderIds,
      canceledBy: input.canceled_by,
    })

    // Release inventory reservations for PAYMENT_PENDING order-sets
    const isPaymentPending = transform(
      { orderSet },
      ({ orderSet }) => orderSet.status?.toUpperCase?.() === OrderLineItemStatus.PAYMENT_PENDING
    )

    when({ isPaymentPending }, ({ isPaymentPending }) => isPaymentPending).then(() => {
      deleteReservationsForOrdersStep({ orderIds: ordersData.orderIds })
    })

    emitEventStep({
      eventName: 'order-set-cancelled',
      data: {
        id: input.order_set_id,
        canceled_by: input.canceled_by,
        canceled_at: new Date().toISOString()
      }
    })

    return new WorkflowResponse(void 0)
  }
)
