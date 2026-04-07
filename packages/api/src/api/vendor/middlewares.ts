import { MiddlewareRoute } from "@medusajs/medusa"

import { vendorAttributesMiddlewares } from "./attributes/middlewares"
import { vendorBrandsMiddlewares } from "./brands/middlewares"
import { vendorProductCollectionRequestsMiddlewares } from "./requests/product-collections/middlewares"
import { vendorProductCategoryRequestsMiddlewares } from "./requests/product-categories/middlewares"
import { vendorProductTypeRequestsMiddlewares } from "./requests/product-types/middlewares"
import { vendorProductTagRequestsMiddlewares } from "./requests/product-tags/middlewares"

export const vendorMiddlewares: MiddlewareRoute[] = [
  ...vendorProductCollectionRequestsMiddlewares,
  ...vendorProductCategoryRequestsMiddlewares,
  ...vendorProductTypeRequestsMiddlewares,
  ...vendorProductTagRequestsMiddlewares,
  ...vendorAttributesMiddlewares,
  ...vendorBrandsMiddlewares,
]
