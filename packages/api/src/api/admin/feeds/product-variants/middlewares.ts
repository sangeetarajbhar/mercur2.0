import {
  MiddlewareRoute,
  validateAndTransformQuery,
} from "@medusajs/framework"

import { AdminGetProductVariantFeedParams } from "./validators"

export const productVariantFeedMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/feeds/product-variants",
    middlewares: [
      // Validates and normalizes `limit` into a number on `req.validatedQuery`
      validateAndTransformQuery(AdminGetProductVariantFeedParams, {}),
    ],
  },
]


