import {
  MiddlewareRoute,
  validateAndTransformBody
} from '@medusajs/framework'

import { AdminPostReturnsV3ReqSchema } from './validators'

export const returnsV3Middlewares: MiddlewareRoute[] = [
  {
    methods: ['POST'],
    matcher: '/admin/returns/v3',
    middlewares: [
      validateAndTransformBody(AdminPostReturnsV3ReqSchema)
    ]
  },
  {
    methods: ['POST'],
    matcher: '/admin/returns/v3/receive-and-refund/:id',
    middlewares: []
  }
]
