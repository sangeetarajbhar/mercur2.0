import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework"
import { AdminGetStockLocationExtensionsParams } from "./validators"

export const stockLocationExtensionRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/stock-location-extension",
    middlewares: [
      validateAndTransformQuery(AdminGetStockLocationExtensionsParams, {
        defaults: ["limit", "offset", "q", "id", "location_type"],
        isList: true,
      }),
    ],
  },
]
