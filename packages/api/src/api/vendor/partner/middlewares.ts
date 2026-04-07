import { validateAndTransformQuery, MiddlewareRoute } from "@medusajs/framework"
import { vendorPartnerQueryConfig } from "./query-config"
import { VendorGetPartnerParams } from "./validators"

export const vendorPartnerMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/partner",
    middlewares: [
      validateAndTransformQuery(VendorGetPartnerParams, vendorPartnerQueryConfig.list),
    ],
  },
]
