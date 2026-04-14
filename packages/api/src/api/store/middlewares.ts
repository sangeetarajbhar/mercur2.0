import { MiddlewareRoute } from "@medusajs/medusa"

import { storeAttributesMiddlewares } from "./attributes/middlewares"
import { storeBrandMiddlewares } from "./brands/middlewares"
import { storeRefundMethodsMiddlewares } from "./refund-methods/middlewares"
import { storeRequestsMiddlewares } from "./requests/middlewares"
import { storeWishlistMiddlewares } from "./wishlist/middlewares"
import { storeDeliveryPromiseMiddlewares } from "./delivery-promise/middlewares"
import { storeV2ProductListMiddlewares } from "./v2/productlist/middlewares"
import { storeProductRoutesMiddlewares } from "./v2/products/middlewares"
import { storeCustomerV2RoutesMiddlewares } from "./customers/middlewares"

export const storeMiddlewares: MiddlewareRoute[] = [
  ...storeRequestsMiddlewares,
  ...storeAttributesMiddlewares,
  ...storeBrandMiddlewares,
  ...storeRefundMethodsMiddlewares,
  ...storeWishlistMiddlewares,
  ...storeDeliveryPromiseMiddlewares,
  ...storeV2ProductListMiddlewares,
  ...storeProductRoutesMiddlewares,
  ...storeCustomerV2RoutesMiddlewares
]
