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
import {
  validateOrderSetCancellationStep,
  executeCancelOrderWorkflowsStep,
  deleteReservationsForOrdersStep,
} from '../steps'

export type CancelOrderSetWorkflowInput = {
  order_set_id: string
  canceled_by: string
}

export const cancelOrderSetWorkflowId = 'cancel-order-set'

/**
 * This workflow cancels an order-set by:
 * 1. Validating that the order set can be canceled (no rider assigned, no orders with RFR status)
 * 2. Getting all orders in the order set
 * 3. Running cancelOrderWorkflow sequentially for all orders (which emits order.canceled events)
 * 4. Emitting "order-set-cancelled" event
 * 
 * Note: Line items, orders, and order-set are all updated by the order.canceled event subscribers.
 * Sequential execution ensures the last order's subscriber will see all orders as cancelled
 * and automatically update the order-set status.
 */
export const cancelOrderSetWorkflow = createWorkflow(
  cancelOrderSetWorkflowId,
  (input: WorkflowData<CancelOrderSetWorkflowInput>) => {
    // Query order set to validate and get metadata
    const orderSetQuery = useQueryGraphStep({
      entity: 'order_set',
      fields: [
        'id',
        'status',
        'rider_assigned_at'
      ],
      filters: { id: input.order_set_id },
      options: { throwIfKeyNotFound: true }
    }).config({ name: 'get-order-set' })

    const orderSet = transform(
      { orderSetQuery  }as any,
      ({ orderSetQuery }) => orderSetQuery.data[0]
    )

    // Query all orders in the order set with their statuses
    const orderSetOrdersQuery = useQueryGraphStep({
      entity: orderSetOrder.entryPoint,
      fields: [
        'order_id',
        'order.id',
        'order.status'
      ],
      filters: {
        order_set_id: input.order_set_id
      }
    }).config({ name: 'get-order-set-orders' })

    // Extract orders with statuses for validation
    const ordersForValidation = transform(
      { orderSetOrdersQuery },
      ({ orderSetOrdersQuery }) => {
        const links = orderSetOrdersQuery.data || []
        return links.map((link: any) => ({
          id: link.order_id,
          status: link.order?.status
        }))
      }
    )

    // Validate that rider is not assigned and no order has RFR status
    validateOrderSetCancellationStep({ 
      orderSet,
      orders: ordersForValidation
    })
    const ordersData = transform(
      { orderSetOrdersQuery },
      ({ orderSetOrdersQuery }) => {
        const links = orderSetOrdersQuery.data || []
        // Filter out already-cancelled orders - cancelOrderWorkflow throws for those
        const orderIds = links
          .filter((link: any) => {
            const status = link.order?.status?.toUpperCase?.()
            return status !== OrderLineItemStatus.CANCELLED && status !== 'CANCELED'
          })
          .map((link: any) => link.order_id)
        return {
          orderIds
        }
      }
    )

    // Execute cancel workflows for all orders sequentially
    // Each cancelOrderWorkflow emits 'order.canceled' event which triggers subscribers
    // that update line items, orders, and order-set statuses automatically.
    // Sequential execution ensures the last order's subscriber will see all orders as cancelled
    // and update the order-set status.
    executeCancelOrderWorkflowsStep({
      orderIds: ordersData.orderIds,
      canceledBy: input.canceled_by,
    })

    // Release inventory reservations for PAYMENT_PENDING order-sets,
    // since stock was reserved at checkout but payment was never captured.
    const isPaymentPending = transform(
      { orderSet },
      ({ orderSet }) => orderSet.status?.toUpperCase?.() === OrderLineItemStatus.PAYMENT_PENDING
    )

    when({ isPaymentPending }, ({ isPaymentPending }) => isPaymentPending).then(() => {
      deleteReservationsForOrdersStep({
        orderIds: ordersData.orderIds,
      })
    })

    // Emit order-set-cancelled event
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
