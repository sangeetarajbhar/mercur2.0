import { validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { transformProductImageUrls, transformSingleProductImageUrls } from '../../utils/middlewares'
import { validateAndTransformBody } from "@medusajs/framework/http"

import { retrieveAttributeQueryConfig } from './query-config'
import { AdminGetAttributesParams } from './validators'
import { AdminAppEnhaneProductImportType } from "./enhanced-import/validators"

// Middleware to transform image URLs in admin product responses
const transformAdminProductImageUrls = (req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data && typeof data === 'object') {
      // Handle single product response
      if (data.product) {
        transformSingleProductImageUrls(data.product);
      }
      // Handle multiple products response
      if (data.products && Array.isArray(data.products)) {
        transformProductImageUrls(data.products);
      }
    }
    return originalJson.call(this, data);
  };
  next();
};

export const adminProductsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/products/enhanced-import',
    middlewares: [
      validateAndTransformBody(AdminAppEnhaneProductImportType)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/products/:id/applicable-attributes',
    middlewares: [
      validateAndTransformQuery(
        AdminGetAttributesParams,
        retrieveAttributeQueryConfig
      )
    ]
  },
  // Transform image URLs for admin products list page
  {
    method: ['GET'],
    matcher: '/admin/products',
    middlewares: [transformAdminProductImageUrls]
  },
  // Transform image URLs for admin product detail page
  {
    method: ['GET'],
    matcher: '/admin/products/:id',
    middlewares: [transformAdminProductImageUrls]
  },
  // Transform image URLs for admin product update responses
  {
    method: ['POST'],
    matcher: '/admin/products/:id',
    middlewares: [transformAdminProductImageUrls]
  },
  // Transform image URLs for admin product create responses
  {
    method: ['POST'],
    matcher: '/admin/products',
    middlewares: [transformAdminProductImageUrls]
  },
  // Transform image URLs for admin product batch operations
  {
    method: ['POST'],
    matcher: '/admin/products/batch',
    middlewares: [transformAdminProductImageUrls]
  },
  // Transform image URLs for admin product variants
  {
    method: ['GET'],
    matcher: '/admin/products/:id/variants',
    middlewares: [transformAdminProductImageUrls]
  },
  // Transform image URLs for admin product variant detail
  {
    method: ['GET'],
    matcher: '/admin/products/:id/variants/:variant_id',
    middlewares: [transformAdminProductImageUrls]
  },
  // Transform image URLs for admin product variant updates
  {
    method: ['POST'],
    matcher: '/admin/products/:id/variants/:variant_id',
    middlewares: [transformAdminProductImageUrls]
  },
  // Transform image URLs for admin product variant batch operations
  {
    method: ['POST'],
    matcher: '/admin/products/:id/variants/batch',
    middlewares: [transformAdminProductImageUrls]
  }
]
