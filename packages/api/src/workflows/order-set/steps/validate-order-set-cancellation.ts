import { MedusaError } from '@medusajs/framework/utils'
import { createStep } from '@medusajs/framework/workflows-sdk'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

export type ValidateOrderSetCancellationInput = {
  orderSet: {
    id: string
    status: string
  }
}

/**
 * Validates that an order set can be canceled.
 * Throws an error if the order set is already cancelled.
 *
 * Note: rider-assigned and RFR guards are intentionally not checked here.
 * Both are enforced at the order-group level before any cancellation begins.
 */
export const validateOrderSetCancellationStep = createStep(
  'validate-order-set-cancellation',
  ({ orderSet }: ValidateOrderSetCancellationInput) => {
    if (orderSet.status === OrderLineItemStatus.CANCELLED) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Order set is already cancelled`
      )
    }
  }
)

