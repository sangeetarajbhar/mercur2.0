import { MiddlewareRoute } from "@medusajs/medusa"

import { storeAttributesMiddlewares } from "./attributes/middlewares"
import { storeBrandMiddlewares } from "./brands/middlewares"
import { storeRequestsMiddlewares } from "./requests/middlewares"

export const storeMiddlewares: MiddlewareRoute[] = [
  ...storeRequestsMiddlewares,
  ...storeAttributesMiddlewares,
  ...storeBrandMiddlewares,
]
