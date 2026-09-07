import { validateAndTransformQuery } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { adminBrandQueryConfig } from "./query-config"
import { AdminGetBrandsParams } from "./validators"

export const adminBrandsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/brands",
    middlewares: [
      validateAndTransformQuery(AdminGetBrandsParams, adminBrandQueryConfig.list),
    ],
  },
]
