import { validateAndTransformQuery } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { vendorAttributeQueryConfig } from "./query-config"
import { VendorGetAttributeParams, VendorGetAttributesParams } from "./validators"

export const vendorAttributesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/attributes",
    middlewares: [
      validateAndTransformQuery(
        VendorGetAttributesParams,
        vendorAttributeQueryConfig.list
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/vendor/attributes/:id",
    middlewares: [
      validateAndTransformQuery(
        VendorGetAttributeParams,
        vendorAttributeQueryConfig.retrieve
      ),
    ],
  },
]
