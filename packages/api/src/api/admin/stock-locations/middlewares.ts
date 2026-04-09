import { maybeApplyLinkFilter, MiddlewareRoute } from "@medusajs/framework/http"
import {
  validateAndTransformQuery,
} from "@medusajs/framework"
import * as QueryConfig from "./query-config"
import {
  AdminGetStockLocationParams,
  AdminGetStockLocationsParams,
} from "./validators"

export const adminStockLocationRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/stock-locations",
    middlewares: [
      validateAndTransformQuery(
        AdminGetStockLocationsParams,
        QueryConfig.listTransformQueryConfig
      ),
      maybeApplyLinkFilter({
        entryPoint: "sales_channel_location",
        resourceId: "stock_location_id",
        filterableField: "sales_channel_id",
      }),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/stock-locations/:id",
    middlewares: [
      validateAndTransformQuery(
        AdminGetStockLocationParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
]
