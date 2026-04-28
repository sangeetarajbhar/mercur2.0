import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { deleteReservationsByOrderIdWorkflow } from '../workflows/delete-reservations-by-order-id'

export type DeleteReservationsForOrdersInput = {
  orderIds: string[]
}

/**
 * Deletes inventory reservations for each order by running
 * deleteReservationsByOrderIdWorkflow sequentially.
 * Used when cancelling a PAYMENT_PENDING order-set to release reserved stock.
 */
export const deleteReservationsForOrdersStep = createStep(
  'delete-reservations-for-orders',
  async (
    input: DeleteReservationsForOrdersInput,
    { container }
  ): Promise<StepResponse<void>> => {
    const workflow = deleteReservationsByOrderIdWorkflow(container)

    for (const orderId of input.orderIds) {
      await workflow.run({
        input: { order_id: orderId },
      })
    }

    return new StepResponse(void 0)
  }
)
