import { defineMiddlewares } from "@medusajs/medusa"

import { adminRequestsMiddlewares } from "./admin/requests/middlewares"
import { vendorProductCollectionRequestsMiddlewares } from "./vendor/requests/product-collections/middlewares"
import { vendorProductCategoryRequestsMiddlewares } from "./vendor/requests/product-categories/middlewares"
import { vendorProductTypeRequestsMiddlewares } from "./vendor/requests/product-types/middlewares"
import { vendorProductTagRequestsMiddlewares } from "./vendor/requests/product-tags/middlewares"
import { storeRequestsMiddlewares } from "./store/requests/middlewares"
import { zonesRoutesMiddlewares } from "./admin/zones/middlewares"

export default defineMiddlewares({
  routes: [
    ...adminRequestsMiddlewares,
    ...vendorProductCollectionRequestsMiddlewares,
    ...vendorProductCategoryRequestsMiddlewares,
    ...vendorProductTypeRequestsMiddlewares,
    ...vendorProductTagRequestsMiddlewares,
    ...storeRequestsMiddlewares,
    ...zonesRoutesMiddlewares,
  ],
})
