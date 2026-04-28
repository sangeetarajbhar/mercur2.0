import { z } from 'zod'
import { ShipmentStatus } from '../../../../../utils/constants/order-statuses'

const validStatuses = [
  ShipmentStatus.RIDER_ASSIGNED,
  ShipmentStatus.SHIPPED,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.UNDELIVERED
] as const

export type UpdateShipmentStatusType = z.infer<typeof UpdateShipmentStatusSchema>
export const UpdateShipmentStatusSchema = z.object({
  status: z.enum(validStatuses),
  metadata: z.record(z.unknown()).optional(),
  returned_items: z.array(z.string()).optional()
}).strict().superRefine((data, ctx) => {
  if (
    (data.status === ShipmentStatus.RIDER_ASSIGNED || data.status === ShipmentStatus.SHIPPED) &&
    !data.metadata
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `metadata is required when status is ${data.status}`,
      path: ['metadata']
    })
  }
})
