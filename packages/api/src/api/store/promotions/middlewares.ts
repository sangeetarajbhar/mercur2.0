import {
  MiddlewareRoute,
  validateAndTransformQuery
} from '@medusajs/framework'

import {
  storePromotionQueryConfig
} from './query-config'
import {
  VendorGetPromotionsParams,
  StoreGetPromotionsParams
} from './validators'

export const storePromotionsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/promotions',
    middlewares: [
      validateAndTransformQuery(
        StoreGetPromotionsParams,
        storePromotionQueryConfig.list
      ),
      // filterBySellerId()
    ]
  },
]
