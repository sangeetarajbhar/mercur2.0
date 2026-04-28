import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
} from '@medusajs/framework/workflows-sdk'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'

import orderSetOrder from '../../../links/order-set-order'
import {
  cancelFulfillmentsForOrderSetStep,
  executeCancelOrderWorkflowsStep,
  updateOrderSetLineItemsRtoReasonStep,
} from '../steps/'


export type CancelOrderSetRtoWorkflowInput = {
  order_set_id: string
  canceled_by: string
}

export const cancelOrderSetRtoWorkflowId = 'cancel-order-set-rto'

/**
 * RTO (Return to Origin) workflow for an order-set. Performs:
 * 1. Cancel all fulfillments of the order-set via cancelFulfillmentWorkflow
 * 2. Cancel all orders via custom cancelOrderWorkflow (with isRTO so rider check is skipped)
 * 3. Update reason to 'RTO' (and reason_code) for all line items in order_line_item_extension
 *
 * Does not validate rider_assigned_at or RFR status since this is an RTO flow.
 */
export const cancelOrderSetRtoWorkflow = createWorkflow(
  cancelOrderSetRtoWorkflowId,
  (input: WorkflowData<CancelOrderSetRtoWorkflowInput>) => {
    const orderSetOrdersQuery = useQueryGraphStep({
      entity: orderSetOrder.entryPoint,
      fields: ['order_id'],
      filters: {
        order_set_id: input.order_set_id,
      },
    }).config({ name: 'get-order-set-orders' })

    const ordersData = transform(
      { orderSetOrdersQuery },
      ({ orderSetOrdersQuery }) => {
        const links = orderSetOrdersQuery.data || []
        const orderIds = links
          .map((link: { order_id?: string }) => link.order_id)
          .filter((id): id is string => Boolean(id))
        return { orderIds }
      }
    )

    cancelFulfillmentsForOrderSetStep({
      order_set_id: input.order_set_id,
    })

    executeCancelOrderWorkflowsStep({
      orderIds: ordersData.orderIds,
      canceledBy: input.canceled_by,
      isRTO: true,
    })

    updateOrderSetLineItemsRtoReasonStep({
      order_set_id: input.order_set_id,
    })

    return new WorkflowResponse(void 0)
  }
)
