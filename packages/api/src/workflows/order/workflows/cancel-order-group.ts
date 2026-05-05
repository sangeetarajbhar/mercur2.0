import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
} from '@medusajs/framework/workflows-sdk'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'
import { MedusaError } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

import orderGroupOrderSet from '../../../links/order-group-order-set'
import orderSetOrder from '../../../links/order-set-order'
import { executeCancelOrderSetWorkflowsStep } from '../../order-set/steps/execute-cancel-order-set-workflows'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

export type CancelOrderGroupWorkflowInput = {
  order_group_id: string
  canceled_by: string
}

type OrderSetLink = {
  order_set_id?: string
  order_set?: {
    id?: string
    rider_assigned_at?: string | Date | null
  }
}

type OrderSetOrderLink = {
  order_set_id?: string
  order_id?: string
  order?: {
    id?: string
    status?: string
  }
}

/**
 * Validates that an order-group can be cancelled:
 * - At least one order-set must be linked.
 * - None of the linked order-sets may have a rider assigned.
 * - None of the orders across all order-sets may have status 'RFR'.
 */
const validateOrderGroupCancellationStep = createStep(
  'validate-order-group-cancellation',
  ({
    links,
    orderLinks,
  }: {
    links: OrderSetLink[]
    orderLinks: OrderSetOrderLink[]
  }): StepResponse<void> => {
    if (!links || links.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        'No order sets found for this order group'
      )
    }

    const riderAssigned = links.find(
      (link) => link.order_set?.rider_assigned_at
    )
    if (riderAssigned) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Order group cannot be cancelled because a rider has been assigned to order set ${riderAssigned.order_set_id}`
      )
    }

    const rfrOrder = orderLinks.find(
      (link) => link.order?.status?.toUpperCase() === OrderLineItemStatus.RFR
    )
    if (rfrOrder) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Order group cannot be cancelled because one or more orders have status 'RFR'`
      )
    }

    return new StepResponse(void 0)
  }
)

export const cancelOrderGroupWorkflowId = 'cancel-order-group'

/**
 * Cancels an order-group by cancelling all linked order-sets in parallel.
 *
 * Steps:
 * 1. Load all order-sets linked to the order-group (with rider_assigned_at).
 * 2. Load all orders across those order-sets (with status).
 * 3. Validate:
 *    - At least one order-set exists.
 *    - No order-set has a rider assigned.
 *    - No order across any order-set has status 'RFR'.
 * 4. Run cancelOrderSetWorkflow in parallel for every order-set.
 *    Each cancelOrderSetWorkflow handles already-cancelled check, payment voiding,
 *    inventory release, slot restore, and event emission.
 */
export const cancelOrderGroupWorkflow = createWorkflow(
  cancelOrderGroupWorkflowId,
  (input: WorkflowData<CancelOrderGroupWorkflowInput>) => {
    // Load all order-sets linked to this order-group, including rider_assigned_at for guard
    const orderGroupLinksQuery = useQueryGraphStep({
      entity: orderGroupOrderSet.entryPoint,
      fields: [
        'order_set_id',
        'order_set.id',
        'order_set.rider_assigned_at',
      ],
      filters: {
        order_group_id: input.order_group_id,
      },
    }).config({ name: 'get-order-group-order-sets' })

    const links = transform(
      { orderGroupLinksQuery },
      ({ orderGroupLinksQuery }) =>
        (orderGroupLinksQuery.data || []) as OrderSetLink[]
    )

    const orderSetIds = transform({ links }, ({ links }) =>
      links
        .map((link) => link.order_set_id)
        .filter((id): id is string => Boolean(id))
    )

    // Load all orders across every order-set in the group to check for RFR status
    const orderSetOrdersQuery = useQueryGraphStep({
      entity: orderSetOrder.entryPoint,
      fields: [
        'order_set_id',
        'order_id',
        'order.id',
        'order.status',
      ],
      filters: {
        order_set_id: orderSetIds,
      },
    }).config({ name: 'get-order-group-orders' })

    const orderLinks = transform(
      { orderSetOrdersQuery },
      ({ orderSetOrdersQuery }) =>
        (orderSetOrdersQuery.data || []) as OrderSetOrderLink[]
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
