import { MiddlewareRoute } from "@medusajs/medusa"

import { adminAttributesMiddlewares } from "./attributes/middlewares"
import { adminBrandsMiddlewares } from "./brands/middlewares"
import { adminRequestsMiddlewares } from "./requests/middlewares"

export const adminMiddlewares: MiddlewareRoute[] = [
  ...adminRequestsMiddlewares,
  ...adminAttributesMiddlewares,
  ...adminBrandsMiddlewares,
]
