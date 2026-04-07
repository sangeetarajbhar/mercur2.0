import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { adminAttributeQueryConfig } from "./query-config"
import {
  AdminCreateAttribute,
  AdminGetAttributeParams,
  AdminGetAttributesParams,
  AdminUpdateAttribute,
} from "./validators"

export const adminAttributesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/attributes",
    middlewares: [
      validateAndTransformQuery(
        AdminGetAttributesParams,
        adminAttributeQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/attributes",
    middlewares: [
      validateAndTransformBody(AdminCreateAttribute),
      validateAndTransformQuery(
        AdminGetAttributeParams,
        adminAttributeQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/attributes/:id",
    middlewares: [
      validateAndTransformQuery(
        AdminGetAttributeParams,
        adminAttributeQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/attributes/:id",
    middlewares: [
      validateAndTransformBody(AdminUpdateAttribute),
      validateAndTransformQuery(
        AdminGetAttributeParams,
        adminAttributeQueryConfig.retrieve
      ),
    ],
  },
]
