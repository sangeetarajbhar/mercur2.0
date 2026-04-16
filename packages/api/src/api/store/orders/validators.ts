import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export const StoreGetOrdersParams = createFindParams({
  offset: 0,
  limit: 50
}).refine(
  (data) => {
    if (data.offset !== undefined && data.offset < 0) {
      return false
    }
    if (data.limit !== undefined && data.limit < 0) {
      return false
    }
    return true
  },
  {
    message: 'offset and limit must be non-negative numbers'
  }
)

/**
 * @schema StoreCancelOrder
 * title: "Cancel Order"
 * description: "A schema for canceling an order from the store customer side."
 * x-resourceId: StoreCancelOrder
 * type: object
 * properties:
 *   reason:
 *     type: string
 *     description: Optional reason for canceling the order.
 *     maxLength: 500
 */
export type StoreCancelOrderType = z.infer<typeof StoreCancelOrder>
export const StoreCancelOrder = z
  .object({
    reason: z.string().max(500).optional()
  })
  .strict()
