import { MiddlewareRoute, validateAndTransformBody } from "@medusajs/framework"
import { PostAdminCreatePartner } from "./validator"

export const partnerMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/partners",
    middlewares: [validateAndTransformBody(PostAdminCreatePartner)],
  },
]
