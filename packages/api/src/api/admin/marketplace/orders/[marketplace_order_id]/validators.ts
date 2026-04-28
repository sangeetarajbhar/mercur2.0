import { z } from 'zod'

import {
  OrderLineItemStatus,
  STATUSES_REQUIRING_REASON
} from '../../../../../utils/constants/order-statuses'

export const UpdateTrackingSchema = z.object({
  update: z.literal('tracking-details'),
  tracking_id: z.string().min(1),
  courier_code: z.string().min(1)
}).strict()

export const OrderStatus = z.enum([
  OrderLineItemStatus.NEW,
  OrderLineItemStatus.ACCEPTED,
  OrderLineItemStatus.REJECTED,
  OrderLineItemStatus.CANCELLED,
  OrderLineItemStatus.PACKED
])

export const OrderStatusNonNew = z.enum([
  OrderLineItemStatus.ACCEPTED,
  OrderLineItemStatus.REJECTED,
  OrderLineItemStatus.CANCELLED,
  OrderLineItemStatus.PACKED
])

export const LineItemSchema = z.object({
  lineItemId: z.string().min(1, 'Line item ID is required'),
  reason: z.string().optional(),
  reasonCode: z.string().optional()
})

export const UpdateStatusNewSchema = z.object({
  update: z.literal('status'),
  status: z.literal(OrderLineItemStatus.NEW)
}).strict()

export const UpdateStatusSchema = z.object({
  update: z.literal('status'),
  status: OrderStatusNonNew,
  locationCode: z.string().min(1, 'Location code is required'),
  lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required')
}).strict()

export const UpdateMarketplaceOrderSchema = z.union([
  UpdateTrackingSchema,
  UpdateStatusNewSchema,
  UpdateStatusSchema
]).superRefine((data, ctx) => {
  if (
    data.update === 'status' &&
    data.status !== OrderLineItemStatus.NEW &&
    STATUSES_REQUIRING_REASON.includes(data.status as any)
  ) {
    const hasReasons = data.lineItems.every(
      (item) => item.reason && item.reasonCode
    )

    if (!hasReasons) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason and reason code are required when status is REJECTED or CANCELLED',
        path: ['lineItems']
      })
    }
  }
})

export type UpdateMarketplaceOrderInput = z.infer<typeof UpdateMarketplaceOrderSchema>
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>
