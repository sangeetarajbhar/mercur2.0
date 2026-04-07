import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"

import {
  AdminCreateExtraCharge,
  AdminExtraChargeParams,
  AdminUpdateExtraCharge,
} from "./validators"

export const extraChargeMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/extra-charge",
    middlewares: [validateAndTransformQuery(AdminExtraChargeParams, {})],
  },
  {
    method: ["POST"],
    matcher: "/admin/extra-charge",
    middlewares: [validateAndTransformBody(AdminCreateExtraCharge)],
  },
  {
    method: ["POST"],
    matcher: "/admin/extra-charge/:id",
    middlewares: [validateAndTransformBody(AdminUpdateExtraCharge)],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/extra-charge/:id",
    middlewares: [],
  },
]
