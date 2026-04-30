import { z } from 'zod'

/**
 * @schema AdminCreateReturnV3
 * title: "Admin Create Return V3"
 * description: "A schema for admin to create a return with orderId and orderLineItemId."
 * x-resourceId: AdminCreateReturnV3
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
 */
export const AdminPostReturnsV3ReqSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  orderLineItemId: z.string().min(1, 'Order line item ID is required'),
  reason_id: z.string().min(1, 'Return Reason is required'),
  note: z.string().optional().nullable(),
  receive_now: z.boolean().optional(),
  type: z.string().min(1, 'Type is required - upi/bank').optional(),
  type_id: z.string().min(1, 'TypeId is required').optional(),
})

export type AdminPostReturnsV3ReqSchemaType = z.infer<typeof AdminPostReturnsV3ReqSchema>
