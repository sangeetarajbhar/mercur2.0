import { MiddlewareRoute } from "@medusajs/medusa"

import { storeAttributesMiddlewares } from "./attributes/middlewares"
import { storeBrandMiddlewares } from "./brands/middlewares"
import { storeRefundMethodsMiddlewares } from "./refund-methods/middlewares"
import { storeRequestsMiddlewares } from "./requests/middlewares"
import { storeWishlistMiddlewares } from "./wishlist/middlewares"

export const storeMiddlewares: MiddlewareRoute[] = [
  ...storeRequestsMiddlewares,
  ...storeAttributesMiddlewares,
  ...storeBrandMiddlewares,
  ...storeRefundMethodsMiddlewares,
  ...storeWishlistMiddlewares,
]
