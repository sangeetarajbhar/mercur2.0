import { MiddlewareRoute } from "@medusajs/framework/http"
import {
  validateAndTransformQuery,
  validateAndTransformBody,
} from "@medusajs/framework"
import { AdminGetControlsParams, AdminCreateControl, AdminUpdateControl } from "./validators"
import { searchMiddleware } from "./search.middleware"

export const controlsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/controls",
    middlewares: [
      validateAndTransformQuery(AdminGetControlsParams, {
        defaults: ["limit", "offset", "scope", "q"],
        isList: true,
      }),
      searchMiddleware,
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/controls",
    middlewares: [
      validateAndTransformBody(AdminCreateControl),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/controls/:id",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/controls/:id",
    middlewares: [
      validateAndTransformBody(AdminUpdateControl),
    ],
  },
]
