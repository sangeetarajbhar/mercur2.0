import { MedusaError } from '@medusajs/framework/utils'
import { createStep } from '@medusajs/framework/workflows-sdk'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

export type ValidateOrderSetCancellationInput = {
  orderSet: {
    id: string
    status: string
    rider_assigned_at: Date | string | null | undefined
  }
  orders?: Array<{
    id: string
    status?: string | null
  }>
}

/**
 * Validates that an order set can be canceled.
 * Throws an error if:
 * - The order set is already cancelled
 * - A rider has been assigned to the order set
 * - Any order in the order set has status 'RFR'
 */
export const validateOrderSetCancellationStep = createStep(
  'validate-order-set-cancellation',
  ({ orderSet, orders = [] }: ValidateOrderSetCancellationInput) => {
    // Check if order set is already cancelled
    if (orderSet.status === OrderLineItemStatus.CANCELLED) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Order set is already cancelled`
      )
    }

    // Check if rider has been assigned
    if (orderSet.rider_assigned_at) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Order set cannot be canceled because a rider has been assigned`
      )
    }

    // Check if any order has RFR status
    const hasRfrOrder = orders.some(
      (order) => order?.status && order.status.toUpperCase() === OrderLineItemStatus.RFR
    )
    if (hasRfrOrder) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Order set cannot be canceled because one or more orders have status 'RFR'`
      )
    }
  }
)

