import { validateAndTransformQuery } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { storeBrandQueryConfig } from "./route"
import { StoreGetBrandsParams } from "./validators"

export const storeBrandMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/brands",
    middlewares: [
      validateAndTransformQuery(StoreGetBrandsParams, storeBrandQueryConfig.list),
    ],
  },
]
