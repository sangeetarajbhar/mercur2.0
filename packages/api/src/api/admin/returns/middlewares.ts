import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'
import { z } from 'zod'

import { adminReturnQueryConfig } from './query-config'
import {
  AdminPostReturnExtensionReqSchema,
  AdminPostReturnsStatusUpdateReqSchema
} from './validators'
import { returnsV2Middlewares } from './v2/middlewares'
import { returnsV3Middlewares } from "./v3/middlewares";

// Empty query schema for endpoints that don't need query parameters
const EmptyQuerySchema = z.object({})

export const returnsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/returns/:id/status',
    middlewares: [
      validateAndTransformQuery(
        EmptyQuerySchema,
        adminReturnQueryConfig.retrieve
      ),
      validateAndTransformBody(AdminPostReturnsStatusUpdateReqSchema)
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/returns/:id/return-extension',
    middlewares: [
      validateAndTransformQuery(
        EmptyQuerySchema,
        adminReturnQueryConfig.retrieve
      ),
      validateAndTransformBody(AdminPostReturnExtensionReqSchema)
    ]
  },
  ...returnsV2Middlewares,
  ...returnsV3Middlewares,
]
