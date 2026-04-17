import { MiddlewareRoute } from "@medusajs/medusa"

import { vendorAttributesMiddlewares } from "./attributes/middlewares"
import { vendorBrandsMiddlewares } from "./brands/middlewares"
import { vendorPartnerMiddlewares } from "./partner/middlewares"
import { vendorProductCollectionRequestsMiddlewares } from "./requests/product-collections/middlewares"
import { vendorProductCategoryRequestsMiddlewares } from "./requests/product-categories/middlewares"
import { vendorProductTypeRequestsMiddlewares } from "./requests/product-types/middlewares"
import { vendorProductTagRequestsMiddlewares } from "./requests/product-tags/middlewares"
import { vendorPriceListImportMiddlewares } from "./price-list/middlewares"
import { vendorStockLocationsMiddlewares } from "./stock-locations/middlewares"
import { vendorCors } from "./cors"
import { unlessBaseUrl } from "../../shared/infra/http/utils"
import { checkSellerApproved, storeActiveGuard } from "../../shared/infra/http/middlewares"
import { authenticate } from "@medusajs/framework"

export const vendorMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/vendor*',
    middlewares: [vendorCors]
  },
  {
    matcher: '/vendor/*',
    middlewares: [
      unlessBaseUrl(
        /^\/vendor\/(sellers|invites\/accept)$/,
        checkSellerApproved(['bearer', 'session'])
      ),
      unlessBaseUrl(
        /^\/vendor\/(sellers|invites\/accept)$/,
        authenticate('seller', ['bearer', 'session'], {
          allowUnregistered: false
        })
      ),
      unlessBaseUrl(
        /^\/vendor\/(sellers|orders|fulfillment|invites\/accept)/,
        storeActiveGuard
      )
    ]
  },
  ...vendorProductCollectionRequestsMiddlewares,
  ...vendorProductCategoryRequestsMiddlewares,
  ...vendorProductTypeRequestsMiddlewares,
  ...vendorProductTagRequestsMiddlewares,
  ...vendorPriceListImportMiddlewares,
  ...vendorAttributesMiddlewares,
  ...vendorBrandsMiddlewares,
  ...vendorPartnerMiddlewares,
  ...vendorStockLocationsMiddlewares
]
