import {
  MiddlewareRoute,
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import {
  StoreCreateRefundMethodSchema,
  StoreDeleteRefundMethodSchema,
  StoreListRefundMethodsSchema,
  StoreSetDefaultRefundMethodSchema,
} from "./validators"

export const storeRefundMethodsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/refund-methods*",
    middlewares: [authenticate("customer", ["bearer", "session"])],
  },
  {
    method: "POST",
    matcher: "/store/refund-methods",
    middlewares: [validateAndTransformBody(StoreCreateRefundMethodSchema)],
  },
  {
    method: "GET",
    matcher: "/store/refund-methods",
    middlewares: [validateAndTransformQuery(StoreListRefundMethodsSchema, {})],
  },
  {
    method: "PATCH",
    matcher: "/store/refund-methods/:id/set-default",
    middlewares: [validateAndTransformBody(StoreSetDefaultRefundMethodSchema)],
  },
  {
    method: "DELETE",
    matcher: "/store/refund-methods/:id",
    middlewares: [validateAndTransformBody(StoreDeleteRefundMethodSchema)],
  },
]
