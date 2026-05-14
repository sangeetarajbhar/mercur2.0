import { MiddlewareRoute, authenticate } from '@medusajs/framework'
import { RefundMethodParamsSchema } from '../validators'

export const storeRefundMethodIdMiddlewares: MiddlewareRoute[] = [
  // Authentication for all refund-methods/:id endpoints
  {
    matcher: '/store/refund-methods/:id*',
    middlewares: [authenticate('customer', ['bearer', 'session'])]
  }
]
