import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
} from '@medusajs/framework/workflows-sdk'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'

import orderGroupOrderSet from '../../../links/order-group-order-set'
import orderSetOrder from '../../../links/order-set-order'
import { validateOrderGroupCancellationStep } from '../steps'
import { executeCancelOrderSetWorkflowsStep } from '../../order-set/steps/execute-cancel-order-set-workflows'

export type CancelOrderGroupWorkflowInput = {
  order_group_id: string
  canceled_by: string
}

export const cancelOrderGroupWorkflowId = 'cancel-order-group'

/**
 * Cancels an order-group by cancelling all linked order-sets in parallel.
 *
 * Steps:
 * 1. Verify the order-group exists (throwIfKeyNotFound).
 * 2. Load all linked order-sets with rider_assigned_at.
 * 3. Load all orders across those order-sets with their statuses.
 * 4. Validate:
 *    - At least one order-set is linked.
 *    - No order-set has a rider assigned.
 *    - No order has status 'RFR'.
 * 5. Run cancelOrderSetWorkflow in parallel for every order-set.
 *    Each cancelOrderSetWorkflow handles its own already-cancelled check,
 *    payment voiding, inventory release, slot restore, and event emission.
 */
export const cancelOrderGroupWorkflow = createWorkflow(
  cancelOrderGroupWorkflowId,
  (input: WorkflowData<CancelOrderGroupWorkflowInput>) => {
    // Verify order-group exists — throws NOT_FOUND if missing
    useQueryGraphStep({
      entity: 'order_group',
      fields: ['id'],
      filters: { id: input.order_group_id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: 'verify-order-group-exists' })

    // Load all order-sets linked to this order-group (with rider_assigned_at for guard)
    const orderGroupLinksQuery = useQueryGraphStep({
      entity: orderGroupOrderSet.entryPoint,
      fields: [
        'order_set_id',
        'order_set.id',
        'order_set.rider_assigned_at',
      ],
      filters: { order_group_id: input.order_group_id },
    }).config({ name: 'get-order-group-order-sets' })

    const links = transform(
      { orderGroupLinksQuery },
      ({ orderGroupLinksQuery }) => orderGroupLinksQuery.data || []
    )

    const orderSetIds = transform({ links }, ({ links }) =>
      links
        .map((link: { order_set_id?: string }) => link.order_set_id)
        .filter((id): id is string => Boolean(id))
    )

    // Load all orders across every order-set in the group (for RFR status check)
    const orderSetOrdersQuery = useQueryGraphStep({
      entity: orderSetOrder.entryPoint,
      fields: ['order_set_id', 'order_id', 'order.id', 'order.status'],
      filters: { order_set_id: orderSetIds },
    }).config({ name: 'get-order-group-orders' })

    const orderLinks = transform(
      { orderSetOrdersQuery },
      ({ orderSetOrdersQuery }) => orderSetOrdersQuery.data || []
    )

    // Guard: no order-sets → 404, rider assigned → 400, any RFR order → 400
    validateOrderGroupCancellationStep({ links, orderLinks })

    // Cancel all order-sets in parallel
    executeCancelOrderSetWorkflowsStep({
      orderSetIds,
      canceledBy: input.canceled_by,
    })

    return new WorkflowResponse(void 0)
  }
)
