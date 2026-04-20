import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import {
  AdminGetPriceListRequestsParams,
  AdminReviewPriceListRequest,
} from "./validators"
import { adminPriceListRequestConfig } from "./query-config"

export const adminPriceListRequestsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/price-list-requests",
    middlewares: [
      validateAndTransformQuery(
        AdminGetPriceListRequestsParams,
        adminPriceListRequestConfig.list
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/price-list-requests/:id",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/price-list-requests/:id",
    middlewares: [validateAndTransformBody(AdminReviewPriceListRequest)],
  },
]
