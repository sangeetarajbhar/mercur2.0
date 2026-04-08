import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'

import {
  AdminCreateTier,
  AdminUpdateTier,
  AdminGetTiersParams,
  AdminGetTierCustomersParams
} from './validators'
import { adminTierQueryConfig } from './query-config'

export const tiersRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/tiers',
    middlewares: [
      validateAndTransformQuery(
        AdminGetTiersParams,
        adminTierQueryConfig.list
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/tiers',
    middlewares: [
      validateAndTransformBody(AdminCreateTier)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/tiers/:id',
    middlewares: [
      validateAndTransformQuery(
        AdminGetTiersParams,
        adminTierQueryConfig.retrieve
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/tiers/:id',
    middlewares: [
      validateAndTransformBody(AdminUpdateTier)
    ]
  },
  {
    method: ['DELETE'],
    matcher: '/admin/tiers/:id',
    middlewares: []
  },
  {
    method: ['GET'],
    matcher: '/admin/tiers/:id/customers',
    middlewares: [
      validateAndTransformQuery(
        AdminGetTierCustomersParams,
        adminTierQueryConfig.customers
      )
    ]
  }
]

