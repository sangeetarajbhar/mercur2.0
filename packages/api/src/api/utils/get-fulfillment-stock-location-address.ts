import type { OrderReturnLocationGraph } from './get-order-return-location-ids'

/**
 * Resolves `stock_location.address` for the stock location id used on the return fulfillment
 * (`fulfillment.location_id` → `stock_location` row → linked `stock_location_address` via Medusa).
 */
export async function getFulfillmentStockLocationAddress(
  query: OrderReturnLocationGraph,
  fulfillmentLocationId: string | null | undefined
): Promise<Record<string, unknown> | null> {
  if (!fulfillmentLocationId) {
    return null
  }

  const { data } = await query.graph({
    entity: 'stock_location',
    filters: { id: fulfillmentLocationId },
    fields: ['id', 'address.*'],
  })

  const row = data?.[0] as
    | { address?: Record<string, unknown> | null }
    | undefined

  return row?.address ?? null
}
