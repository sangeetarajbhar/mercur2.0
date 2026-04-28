import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'

import { adminOrderSetQueryConfig } from './query-config'
import { AdminOrderSetParams } from './validators'
import { AdminUpdateTracking } from './[id]/tracking/validators'
import { UpdateShipmentStatusSchema } from './shipment/[id]/validators'

export const orderSetsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/order-sets',
    middlewares: [
      validateAndTransformQuery(
        AdminOrderSetParams,
        adminOrderSetQueryConfig.list
      )
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/order-sets/:id',
    middlewares: [
      validateAndTransformQuery(
        AdminOrderSetParams,
        adminOrderSetQueryConfig.retrieve
      )
    ]
  },
  {
    method: ['PATCH'],
    matcher: '/admin/order-sets/:id/tracking',
    middlewares: [
      validateAndTransformBody(AdminUpdateTracking)
    ]
  },
  {
    method: ['PATCH'],
    matcher: '/admin/order-sets/shipment/:id',
    middlewares: [
      validateAndTransformBody(UpdateShipmentStatusSchema)
    ]
  }
]
