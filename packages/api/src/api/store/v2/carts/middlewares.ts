import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'
import * as QueryConfig from '@medusajs/medusa/api/store/carts/query-config'
// import { StoreGetCartsCart } from '@medusajs/medusa/api/store/carts/validators'
import { StoreAddCartShippingMethods } from '@medusajs/medusa/api/store/carts/validators'
import { StoreDeleteCartShippingMethods, StoreGetCartsCartV2, StoreUpdateCartV2, StoreUpdateCartsCartV2 } from './validators'

export const storeCartsMiddlewares: MiddlewareRoute[] = [
  // Add middleware for v2 cart GET route
  {
    method: ['GET'],
    matcher: '/store/v2/carts/:id',
    middlewares: [
      validateAndTransformQuery(
        StoreGetCartsCartV2,
        QueryConfig.retrieveTransformQueryConfig
      )
    ]
  },
  // Add middleware for v2 cart POST route
  {
    method: ['POST'],
    matcher: '/store/v2/carts/:id',
    middlewares: [
      validateAndTransformBody(StoreUpdateCartV2),
      validateAndTransformQuery(
        StoreUpdateCartsCartV2,
        QueryConfig.retrieveTransformQueryConfig
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/carts/:id/shipping-methods',
    middlewares: [
      validateAndTransformBody(StoreAddCartShippingMethods),
      validateAndTransformQuery(
        StoreGetCartsCartV2,
        QueryConfig.retrieveTransformQueryConfig
      )
    ]
  },
  {
    method: ['DELETE'],
    matcher: '/store/carts/:id/shipping-methods',
    middlewares: [
      validateAndTransformBody(StoreDeleteCartShippingMethods),
      validateAndTransformQuery(
        StoreGetCartsCartV2,
        QueryConfig.retrieveTransformQueryConfig
      )
    ]
  }
]
