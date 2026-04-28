import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  deleteReservationsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
export type DeleteReservationsByOrderIdWorkflowInput = {
  order_id: string
}

export const deleteReservationsByOrderIdWorkflowId = "delete-reservations-by-order-id"

/**
 * Workflow that deletes all inventory reservations for an order.
 * Use when you only have order_id and want to release reservations (e.g. on cancel, payment failure).
 *
 * Steps:
 * 1. Get order → line item IDs
 * 2. Get reservations by line_item_id
 * 3. Delete those reservations
 */
export const deleteReservationsByOrderIdWorkflow = createWorkflow(
  { name: deleteReservationsByOrderIdWorkflowId, idempotent: true },
  (input: WorkflowData<DeleteReservationsByOrderIdWorkflowInput>) => {
    const orderQuery = useQueryGraphStep({
      entity: "orders",
      fields: ["id", "items.id"],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-order" })

    const lineItemIds = transform({ orderQuery } as any, ({ orderQuery }) => {
      return (orderQuery.data?.[0]?.items ?? []).map((i: { id: string }) => i.id)
    })

    const reservationsQuery = useQueryGraphStep({
      entity: "reservation",
      fields: ["id"],
      filters: { line_item_id: lineItemIds },
    }).config({ name: "get-reservations" })

    const reservationIds = transform({ reservationsQuery }, ({ reservationsQuery }) => {
      return (reservationsQuery.data ?? []).map((r: { id: string }) => r.id)
    })

    when({ reservationIds }, ({ reservationIds }) => reservationIds.length > 0).then(() => {
      deleteReservationsStep(reservationIds)
    })

    return new WorkflowResponse({
      order_id: input.order_id,
      reservation_ids: reservationIds,
    })
  }
)
