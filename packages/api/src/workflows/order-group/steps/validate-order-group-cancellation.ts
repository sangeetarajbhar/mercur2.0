import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'

import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

export type ValidateOrderGroupCancellationInput = {
  links: Array<{
    order_set_id?: string
    order_set?: {
      id?: string
      rider_assigned_at?: string | Date | null
    }
  }>
  orderLinks: Array<{
    order_set_id?: string
    order_id?: string
    order?: {
      id?: string
      status?: string
    }
  }>
}

/**
 * Validates that an order-group can be cancelled:
 * - At least one order-set must be linked.
 * - None of the linked order-sets may have a rider assigned.
 * - None of the orders across all order-sets may have status 'RFR'.
 */
export const validateOrderGroupCancellationStep = createStep(
  'validate-order-group-cancellation',
  ({ links, orderLinks }: ValidateOrderGroupCancellationInput): StepResponse<void> => {
    if (!links || links.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        'No order sets found for this order group'
      )
    }

    const riderAssigned = links.find((link) => link.order_set?.rider_assigned_at)
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
