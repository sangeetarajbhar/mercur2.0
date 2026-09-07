import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"

import {
  AdminCreateExtraChargeRule,
  AdminExtraChargeRuleParams,
  AdminUpdateExtraChargeRule,
} from "./validators"

export const extraChargeRuleMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/extra-charge-rules",
    middlewares: [validateAndTransformQuery(AdminExtraChargeRuleParams, {})],
  },
  {
    method: ["POST"],
    matcher: "/admin/extra-charge-rules",
    middlewares: [validateAndTransformBody(AdminCreateExtraChargeRule)],
  },
  {
    method: ["POST"],
    matcher: "/admin/extra-charge-rules/:id",
    middlewares: [validateAndTransformBody(AdminUpdateExtraChargeRule)],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/extra-charge-rules/:id",
    middlewares: [],
  },
]
