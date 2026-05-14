import { MiddlewareRoute, validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework"
import { z } from "zod"
import { StoreCreateRefundMethodSchema } from "../../store/refund-methods/validators"
import { AdminCreateRefundMethodSchema } from "./validators"

const AdminGetRefundMethodsParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  order: z.string().optional(),
  fields: z.string().optional(),
  customer_id: z.string().optional(),
  type: z.enum(["bank", "upi"]).optional(),
  is_default: z.string().optional(),
  q: z.string().optional(),
  created_at: z.any().optional(),
  "created_at[$gte]": z.string().optional(),
  "created_at[$lte]": z.string().optional(),
  "created_at[$gt]": z.string().optional(),
  "created_at[$lt]": z.string().optional(),
})

export const adminRefundMethodsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/refund-methods",
    middlewares: [
      validateAndTransformQuery(AdminGetRefundMethodsParamsSchema, {
        defaults: ["limit", "offset"],
        isList: true,
      }),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/refund-methods/:id/customer",
    middlewares: [validateAndTransformBody(StoreCreateRefundMethodSchema)],
  },
  {
    method: ["POST"],
    matcher: "/admin/refund-methods/:id/status",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/refund-methods",
    middlewares: [validateAndTransformBody(AdminCreateRefundMethodSchema)],
  },
]
