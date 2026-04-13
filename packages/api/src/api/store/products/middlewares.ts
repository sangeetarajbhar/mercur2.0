import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from '@medusajs/framework'
import { StoreGetVariantDeliveryPromiseParams } from './validators'

export const storeProductRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/products/variants/:id/delivery-promise',
    middlewares: [
      validateAndTransformQuery(
        StoreGetVariantDeliveryPromiseParams,
        {
          defaults: [],
          isList: false,
        }
      ),
    ],
  },
]