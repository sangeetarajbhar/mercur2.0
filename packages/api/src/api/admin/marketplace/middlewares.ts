import {
  MiddlewareRoute,
  validateAndTransformBody
} from '@medusajs/framework'

// import { UpdateShipmentStatusSchema } from '../../vendor/marketplace/shipments/[shipmentId]/status/validators'
import { UpdateMarketplaceOrderSchema } from './orders/[marketplace_order_id]/validators'

export const adminMarketplaceMiddlewares: MiddlewareRoute[] = [
  // {
  //   method: ['POST'],
  //   matcher: '/admin/marketplace/shipments/:shipmentId/status',
  //   middlewares: [
  //     validateAndTransformBody(UpdateShipmentStatusSchema)
  //   ]
  // },
  {
    method: ['PATCH'],
    matcher: '/admin/marketplace/orders/:marketplace_order_id',
    middlewares: [
      validateAndTransformBody(UpdateMarketplaceOrderSchema)
    ]
  }
]

