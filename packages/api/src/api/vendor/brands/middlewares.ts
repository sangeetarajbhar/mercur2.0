import { validateAndTransformQuery } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { vendorBrandQueryConfig } from "./query-config"
import { VendorGetBrandsParams } from "./validators"

export const vendorBrandsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/brands",
    middlewares: [
      validateAndTransformQuery(VendorGetBrandsParams, vendorBrandQueryConfig.list),
    ],
  },
]
