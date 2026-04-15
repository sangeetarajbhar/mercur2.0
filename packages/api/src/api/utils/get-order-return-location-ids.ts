import { MedusaError } from '@medusajs/framework/utils'

export type OrderReturnLocationGraph = {
  graph: (args: {
    entity: string
    fields: string[]
    filters: Record<string, unknown>
  }) => Promise<{ data: unknown[] }>
}

export type OrderReturnLocationIds = {
  /** `order_extra_detail.stock_location_id` for the order */
  stock_location_id: string
  /** `stock_location_extension.return_location_id` — use as Medusa return `location_id` */
  return_location_id: string
}

/**
 * Resolves fulfillment return location for an order: order_extra_detail → stock_location extension.
 * Throws MedusaError NOT_FOUND when data is missing or return_location_id is not configured.
 */
export async function getOrderReturnLocationIds(
  query: OrderReturnLocationGraph,
  orderId: string
): Promise<OrderReturnLocationIds> {
  const {
    data: [orderExtraDetail],
  } = await query.graph({
    entity: 'order_extra_detail',
    fields: ['stock_location_id'],
    filters: { order_id: orderId },
  })

  const stockLocationId = (
    orderExtraDetail as { stock_location_id?: string | null } | undefined
  )?.stock_location_id

  if (!stockLocationId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `order_extra_detail.stock_location_id not found for order ${orderId}`
    )
  }

  const {
    data: [stockLocation],
  } = await query.graph({
    entity: 'stock_location',
    fields: ['stock_location_extension.return_location_id'],
    filters: { id: stockLocationId },
  })

  const returnLocationId =
    (
      stockLocation as
        | {
            stock_location_extension?: {
              return_location_id?: string | null
            }
          }
        | undefined
    )?.stock_location_extension?.return_location_id ?? null

  if (!returnLocationId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `return_location_id not configured on stock_location_extension for stock location ${stockLocationId}`
    )
  }

  return {
    stock_location_id: stockLocationId,
    return_location_id: returnLocationId,
  }
}
