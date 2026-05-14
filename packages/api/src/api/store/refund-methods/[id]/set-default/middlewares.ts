import { MiddlewareRoute, authenticate, validateAndTransformBody } from '@medusajs/framework'
import { StoreSetDefaultRefundMethodSchema } from '../../validators'

export const storeRefundMethodSetDefaultMiddlewares: MiddlewareRoute[] = [
  // Authentication for set-default endpoint
  {
    matcher: '/store/refund-methods/:id/set-default',
    middlewares: [authenticate('customer', ['bearer', 'session'])]
  },
  // Body validation for PATCH set-default
  {
    method: 'PATCH',
    matcher: '/store/refund-methods/:id/set-default',
    middlewares: [
      validateAndTransformBody(StoreSetDefaultRefundMethodSchema)
    ]
  }
]
