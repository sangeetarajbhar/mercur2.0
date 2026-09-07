import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { AdminCreateRefundMethodSchema, AdminListRefundMethodsSchema } from "./validators"

export const adminRefundMethodsMiddlewares: MiddlewareRoute[] = [
  {
    method: "GET",
    matcher: "/admin/refund-methods",
    middlewares: [validateAndTransformQuery(AdminListRefundMethodsSchema, { isList: true })],
  },
  {
    method: "POST",
    matcher: "/admin/refund-methods",
    middlewares: [validateAndTransformBody(AdminCreateRefundMethodSchema)],
  },
]
