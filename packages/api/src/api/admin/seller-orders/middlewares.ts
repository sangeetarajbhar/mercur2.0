import { NextFunction } from 'express'

import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'

import sellerOrderLink from '../../../links/seller-order'
import sellerLocationLink from '../../../links/seller-stock-location'
import { checkResourceOwnershipByResourceId } from '../../../shared/infra/http/middlewares'
import {
  sellerOrderChangesQueryConfig,
  sellerOrderQueryConfig
} from './query-config'
import {
  SellerCreateFulfillment,
  SellerCreateFulfillmentType,
  SellerGetOrderChangesParams,
  SellerGetOrderParams,
  SellerOrderCreateShipment
} from './validators'

const transformPaymentFilters = () => {
  return async (
    req: MedusaRequest,
    _res: MedusaResponse,
    next: NextFunction
  ) => {
    if (!req.queryConfig || !req.queryConfig.fields) {
      return next()
    }

    req.queryConfig.fields = req.queryConfig.fields
      .filter((f) => !f.includes('payment_collections'))
      .concat(['split_order_payment.*'])

    return next()
  }
}

export const sellerOrderMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/seller-orders',
    middlewares: [
      validateAndTransformQuery(
        SellerGetOrderParams,
        sellerOrderQueryConfig.list
      ),
      transformPaymentFilters()
    ]
  },
  // {
  //   method: ['GET'],
  //   matcher: '/vendor/orders',
  //   middlewares: [
  //     validateAndTransformQuery(
  //       SellerGetOrderParams,
  //       sellerOrderQueryConfig.list
  //     ),
  //     transformPaymentFilters()
  //   ]
  // },
  // {
  //   method: ['GET'],
  //   matcher: '/vendor/orders/:id',
  //   middlewares: [
  //     validateAndTransformQuery(
  //       SellerGetOrderParams,
  //       sellerOrderQueryConfig.retrieve
  //     ),
  //     transformPaymentFilters(),
  //     checkResourceOwnershipByResourceId({
  //       entryPoint: sellerOrderLink.entryPoint,
  //       filterField: 'order_id'
  //     })
  //   ]
  // },
  // {
  //   method: ['POST'],
  //   matcher: '/vendor/orders/:id/cancel',
  //   middlewares: [
  //     validateAndTransformQuery(
  //       SellerGetOrderParams,
  //       sellerOrderQueryConfig.retrieve
  //     ),
  //     transformPaymentFilters(),
  //     checkResourceOwnershipByResourceId({
  //       entryPoint: sellerOrderLink.entryPoint,
  //       filterField: 'order_id'
  //     })
  //   ]
  // },
  // {
  //   method: ['POST'],
  //   matcher: '/vendor/orders/:id/complete',
  //   middlewares: [
  //     validateAndTransformQuery(
  //       SellerGetOrderParams,
  //       sellerOrderQueryConfig.retrieve
  //     ),
  //     transformPaymentFilters(),
  //     checkResourceOwnershipByResourceId({
  //       entryPoint: sellerOrderLink.entryPoint,
  //       filterField: 'order_id'
  //     })
  //   ]
  // },
  // {
  //   method: ['POST'],
  //   matcher: '/vendor/orders/:id/fulfillments',
  //   middlewares: [
  //     validateAndTransformBody(SellerCreateFulfillment),
  //     checkResourceOwnershipByResourceId({
  //       entryPoint: sellerOrderLink.entryPoint,
  //       filterField: 'order_id'
  //     }),
  //     checkResourceOwnershipByResourceId({
  //       entryPoint: sellerLocationLink.entryPoint,
  //       filterField: 'stock_location_id',
  //       resourceId: (
  //         req: AuthenticatedMedusaRequest<SellerCreateFulfillmentType>
  //       ) => req.validatedBody.location_id
  //     })
  //   ]
  // },
  // {
  //   method: ['GET'],
  //   matcher: '/vendor/orders/:id/changes',
  //   middlewares: [
  //     validateAndTransformQuery(
  //       SellerGetOrderChangesParams,
  //       sellerOrderChangesQueryConfig.list
  //     ),
  //     transformPaymentFilters(),
  //     checkResourceOwnershipByResourceId({
  //       entryPoint: sellerOrderLink.entryPoint,
  //       filterField: 'order_id'
  //     })
  //   ]
  // },
  // {
  //   method: ['POST'],
  //   matcher: '/vendor/orders/:id/fulfillments/:fulfillment_id/cancel',
  //   middlewares: [
  //     validateAndTransformQuery(
  //       SellerGetOrderParams,
  //       sellerOrderQueryConfig.retrieve
  //     ),
  //     transformPaymentFilters(),
  //     checkResourceOwnershipByResourceId({
  //       entryPoint: sellerOrderLink.entryPoint,
  //       filterField: 'order_id'
  //     })
  //   ]
  // },
  // {
  //   method: ['POST'],
  //   matcher:
  //     '/vendor/orders/:id/fulfillments/:fulfillment_id/mark-as-delivered',
  //   middlewares: [
  //     validateAndTransformQuery(
  //       SellerGetOrderParams,
  //       sellerOrderQueryConfig.retrieve
  //     ),
  //     transformPaymentFilters(),
  //     checkResourceOwnershipByResourceId({
  //       entryPoint: sellerOrderLink.entryPoint,
  //       filterField: 'order_id'
  //     })
  //   ]
  // },
  // {
  //   method: ['POST'],
  //   matcher: '/vendor/orders/:id/fulfillments/:fulfillment_id/shipments',
  //   middlewares: [
  //     validateAndTransformBody(SellerOrderCreateShipment),
  //     validateAndTransformQuery(
  //       SellerGetOrderParams,
  //       sellerOrderQueryConfig.retrieve
  //     ),
  //     transformPaymentFilters(),
  //     checkResourceOwnershipByResourceId({
  //       entryPoint: sellerOrderLink.entryPoint,
  //       filterField: 'order_id'
  //     })
  //   ]
  // }
]
