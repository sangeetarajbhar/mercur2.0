import {
  MiddlewareRoute,
  unlessPath,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'
import { listProductQueryConfig } from '@medusajs/medusa/api/admin/products/query-config'

import {
  adminSellerOrdersQueryConfig,
  adminSellerQueryConfig
} from './query-config'
import {
  AdminGetSellerCustomerGroupsParams,
  AdminGetSellerOrdersParams,
  AdminGetSellerProductsParams,
  AdminInviteSeller,
  AdminSellerParams,
  AdminUpdateSeller,
  createSellerOnboardingSchema,
  updateSellerBrandAssociationsSchema,
  updateSellerOnboardingSchema
} from './validators'
import multer from "multer"
import { sellerUploadMiddlewares } from './uploads/middlewares'

const upload = multer({ storage: multer.memoryStorage() })


export const sellerMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/sellers',
    middlewares: [
      validateAndTransformQuery(AdminSellerParams, adminSellerQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/sellers/:id',
    middlewares: [
      unlessPath(
        /.*\/sellers\/invite/,
        validateAndTransformQuery(
          AdminSellerParams,
          adminSellerQueryConfig.retrieve
        )
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/sellers/v2/:id',
    middlewares: [
      unlessPath(
        /.*\/sellers\/invite/,
        validateAndTransformQuery(
          AdminSellerParams,
          adminSellerQueryConfig.retrieve
        )
      ),
      unlessPath(
        /.*\/sellers\/invite/,
        validateAndTransformBody(AdminUpdateSeller)
      )
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/sellers/:id/products',
    middlewares: [
      unlessPath(
        /.*\/sellers\/invite/,
        validateAndTransformQuery(
          AdminGetSellerProductsParams,
          listProductQueryConfig
        )
      )
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/sellers/:id/orders',
    middlewares: [
      unlessPath(
        /.*\/sellers\/invite/,
        validateAndTransformQuery(
          AdminGetSellerOrdersParams,
          adminSellerOrdersQueryConfig.list
        )
      )
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/sellers/:id/customer-groups',
    middlewares: [
      unlessPath(
        /.*\/sellers\/invite/,
        validateAndTransformQuery(
          AdminGetSellerCustomerGroupsParams,
          adminSellerOrdersQueryConfig.list
        )
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/sellers/invite',
    middlewares: [validateAndTransformBody(AdminInviteSeller)]
  },
  {
      matcher: "/admin/sellers/create",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
      middlewares: [
        upload.fields([
          { name: "member_photo", maxCount: 1 },
          { name: "kyc_files", maxCount: 10 }
        ]),
        validateAndTransformBody(createSellerOnboardingSchema)

      ],
    },
    {
      matcher: "/admin/sellers/:id/update",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
      middlewares: [
        upload.fields([
          { name: "member_photo", maxCount: 1 },
          { name: "kyc_files", maxCount: 10 }
        ]),
        validateAndTransformBody(updateSellerOnboardingSchema) // Define this schema similarly to create
      ],
    },
    {
      matcher: "/admin/sellers/:id/brands",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(updateSellerBrandAssociationsSchema)
      ]
    },
    ...sellerUploadMiddlewares,
]