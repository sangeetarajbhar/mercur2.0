import { MiddlewareRoute } from "@medusajs/medusa"

import { storeBrandMiddlewares } from "./brands/middlewares"
import { storePromotionsMiddlewares } from "./promotions/middlewares"
import { storeRefundMethodsMiddlewares } from "./refund-methods/middlewares"
import { storeRequestsMiddlewares } from "./requests/middlewares"
import { storeUploadsMiddlewares } from "./uploads/middlewares"
import { storeWishlistMiddlewares } from "./wishlist/middlewares"
import { storeDeliveryPromiseMiddlewares } from "./delivery-promise/middlewares"
import { storeV2ProductListMiddlewares } from "./v2/productlist/middlewares"
import { storeProductRoutesMiddlewares } from "./v2/products/middlewares"
import { storeCustomerV2RoutesMiddlewares } from "./customers/middlewares"
import { storeSellerMiddlewares } from "./seller/middlewares"

export const storeMiddlewares: MiddlewareRoute[] = [
  ...storeRequestsMiddlewares,
  ...storeBrandMiddlewares,
  ...storePromotionsMiddlewares,
  ...storeRefundMethodsMiddlewares,
  ...storeWishlistMiddlewares,
  ...storeDeliveryPromiseMiddlewares,
  ...storeV2ProductListMiddlewares,
  ...storeProductRoutesMiddlewares,
  ...storeCustomerV2RoutesMiddlewares,
  ...storeSellerMiddlewares,
  ...storeUploadsMiddlewares
]
