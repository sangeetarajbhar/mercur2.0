import { z } from 'zod'

/**
 * @schema AdminCreateReturnV2
 * title: "Admin Create Return V2"
 * description: "A schema for admin to create a return with orderId and orderLineItemId."
 * x-resourceId: AdminCreateReturnV2
 * type: object
 * required:
 *   - orderId
 *   - orderLineItemId
 * properties:
 *   orderId:
 *     type: string
 *     description: ID of the order
 *   orderLineItemId:
 *     type: string
 *     description: ID of the order line item to return
 *   reason_id:
 *     type: string
 *     description: ID of the reason for return
 *   note:
 *     type: string
 *     description: Note about the return
 *   receive_now:
 *     type: boolean
 *     description: Whether to receive the return immediately
 *   location_id:
 *     type: string
 *     description: ID of the location
 */
export const AdminPostReturnsV2ReqSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  orderLineItemId: z.string().min(1, 'Order line item ID is required'),
  reason_id: z.string().optional(),
  note: z.string().optional(),
  receive_now: z.boolean().optional(),
  refund_method_id: z.string().optional().nullish(),
  // location_id: z.string().optional()
})

export type AdminPostReturnsV2ReqSchemaType = z.infer<typeof AdminPostReturnsV2ReqSchema>


