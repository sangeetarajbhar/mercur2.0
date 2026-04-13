import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'
import * as QueryConfig from '@medusajs/medusa/api/store/carts/query-config'
import { StoreGetCartsCart } from '@medusajs/medusa/api/store/carts/validators'
import { StoreAddCartShippingMethods } from '@medusajs/medusa/api/store/carts/validators'
import { 
  StoreDeleteCartShippingMethods, 
  StoreGetCartWithResolution,
  StoreAddCartLineItemWithMetadata,
  StoreUpdateCartLineItemWithMetadata
} from './validators'

export const storeCartsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/store/carts/:id/shipping-methods',
    middlewares: [
      validateAndTransformBody(StoreAddCartShippingMethods),
      validateAndTransformQuery(
        StoreGetCartsCart,
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
        StoreGetCartsCart,
        QueryConfig.retrieveTransformQueryConfig
      )
    ]
  },
  {
    method: ['GET'],
    matcher: '/store/carts/:id/v2',
    middlewares: [
      validateAndTransformQuery(
        StoreGetCartWithResolution,
        QueryConfig.retrieveTransformQueryConfig
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/carts/:id/line-items',
    middlewares: [
      validateAndTransformBody(StoreAddCartLineItemWithMetadata),
      validateAndTransformQuery(
        StoreGetCartsCart,
        QueryConfig.retrieveTransformQueryConfig
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/carts/:id/line-items/:line_id',
    middlewares: [
      validateAndTransformBody(StoreUpdateCartLineItemWithMetadata),
      validateAndTransformQuery(
        StoreGetCartsCart,
        QueryConfig.retrieveTransformQueryConfig
      )
    ]
  },
]
