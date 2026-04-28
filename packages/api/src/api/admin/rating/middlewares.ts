import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import {
  AdminCreateRatingOption,
  AdminGetRatingFeedbackParams,
  AdminUpdateRatingGlobalConfig,
  AdminUpdateRatingOption,
} from "./validators"

export const adminRatingMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/rating/config",
    middlewares: [validateAndTransformBody(AdminUpdateRatingGlobalConfig)],
  },
  {
    method: ["POST"],
    matcher: "/admin/rating/options",
    middlewares: [validateAndTransformBody(AdminCreateRatingOption)],
  },
  {
    method: ["POST"],
    matcher: "/admin/rating/options/:id",
    middlewares: [validateAndTransformBody(AdminUpdateRatingOption)],
  },
  {
    method: ["GET"],
    matcher: "/admin/rating/feedback",
    middlewares: [
      validateAndTransformQuery(AdminGetRatingFeedbackParams, {
        defaults: ["limit", "offset", "rating", "customer_id", "order_id"],
        isList: true,
      }),
    ],
  },
]

