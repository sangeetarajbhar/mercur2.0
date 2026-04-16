import {
  validateAndTransformBody,
  validateAndTransformQuery,
  MiddlewareRoute
} from '@medusajs/framework'

import { checkCustomerResourceOwnershipByResourceId } from '../../../shared/infra/http/middlewares/check-customer-ownership'
import { StoreCancelOrder, StoreGetOrdersParams } from './validators'
import { storeOrderQueryConfig } from './query-config'

export const storeOrdersMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/store/orders/:id/cancel',
    middlewares: [
      validateAndTransformBody(StoreCancelOrder),
      checkCustomerResourceOwnershipByResourceId({
        entryPoint: 'order'
      })
    ]
  },
  {
    method:['GET'],
    matcher:'/store/orders',
    middlewares:[
      validateAndTransformQuery(StoreGetOrdersParams, storeOrderQueryConfig.list),
    ]
  }
]
