import { MathBN } from "@medusajs/framework/utils"
import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  parallelize,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  adjustInventoryLevelsStep,
  deleteReservationsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"

export type AdjustInventoryOnOrderAcknowledgementWorkflowInput = {
  order_id: string
}

export const adjustInventoryOnOrderAcknowledgementWorkflowId =
  "adjust-inventory-on-order-acknowledgement"

export const adjustInventoryOnOrderAcknowledgementWorkflow = createWorkflow(
  { name: adjustInventoryOnOrderAcknowledgementWorkflowId, idempotent: true },
  (input: WorkflowData<AdjustInventoryOnOrderAcknowledgementWorkflowInput>) => {
    const orderQuery = useQueryGraphStep({
      entity: "orders",
      fields: ["id", "items.id"],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-order" })

    const lineItemIds :string[] = transform({ orderQuery }, ({ orderQuery }: { orderQuery: any }) => {
      return (orderQuery.data?.[0]?.items ?? []).map((i) => i?.id)
    })

    const reservationsQuery = useQueryGraphStep({
      entity: "reservation",
      fields: ["id", "line_item_id", "quantity", "inventory_item_id", "location_id"],
      filters: { line_item_id: lineItemIds },
    }).config({ name: "get-reservations" })

    const reservationIds :string[] = transform({ reservationsQuery }, ({ reservationsQuery }: { reservationsQuery: any }) => {
      return (reservationsQuery.data ?? []).map((r) => r.id)
    })

    const inventoryAdjustments = transform({ reservationsQuery }, ({ reservationsQuery }) => {
      const reservations = reservationsQuery.data ?? []
      const grouped = new Map<string, { inventory_item_id: string; location_id: string; adjustment: any }>()

      for (const r of reservations) {
        if (!r.inventory_item_id || !r.location_id) continue

        const key = `${r.inventory_item_id}:${r.location_id}`
        const adjustment = MathBN.mult(r.quantity, -1)
        const existing = grouped.get(key)

        if (existing) {
          existing.adjustment = MathBN.add(existing.adjustment, adjustment)
        } else {
          grouped.set(key, {
            inventory_item_id: r.inventory_item_id,
            location_id: r.location_id,
            adjustment,
          })
        }
      }

      return Array.from(grouped.values())
    })

    when({ reservationIds }, ({ reservationIds }) => reservationIds.length > 0).then(() => {
      parallelize(
        adjustInventoryLevelsStep(inventoryAdjustments),
        deleteReservationsStep(reservationIds)
      )
    })

    return new WorkflowResponse({
      order_id: input.order_id,
      reservation_ids: reservationIds,
    })
  }
)

