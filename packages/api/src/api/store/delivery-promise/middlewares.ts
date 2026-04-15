import { validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { StoreGetDeliveryPromiseParams } from './validators'

export const storeDeliveryPromiseMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/delivery-promise',
    middlewares: [
      validateAndTransformQuery(
        StoreGetDeliveryPromiseParams,
        {
          defaults: [],
          isList: false,
        }
      ),
    ],
  },
]

