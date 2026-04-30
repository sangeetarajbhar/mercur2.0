import {
  MiddlewareRoute,
  validateAndTransformBody
} from '@medusajs/framework'

import { AdminPostReturnsV2ReqSchema } from './validators'

export const returnsV2Middlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/returns/v2',
    middlewares: [
      validateAndTransformBody(AdminPostReturnsV2ReqSchema)
    ]
  }
]