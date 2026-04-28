import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'
import { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'

import { applyRequestsStatusFilter } from '../../../shared/infra/http/middlewares/apply-request-status-filter'
import { adminReturnOrderRequestQueryConfig } from './query-config'
import {
  AdminGetOrderReturnRequestParams,
  AdminUpdateOrderReturnRequest
} from './validators'

/**
 * Validates that a date range does not exceed 7 days
 * @param dateFilter - The date filter object with start_date and optionally end_date properties
 * @param fieldName - The name of the field being validated (for error messages)
 * @throws MedusaError if the date range exceeds 7 days or if required fields are missing
 */
const validateDateRange = (
  dateFilter: { start_date?: string; end_date?: string } | undefined,
  fieldName: string
): void => {
  if (!dateFilter || !dateFilter.start_date) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} is required and must include start_date`
    )
  }

  const startDate = new Date(dateFilter.start_date)
  let endDate: Date
  
  // If end_date is provided, use it; otherwise, use current date
  if (dateFilter.end_date) {
    endDate = new Date(dateFilter.end_date)
  } else {
    endDate = new Date() // Current date
  }

  // Validate that dates are valid
  if (isNaN(startDate.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} start_date is not a valid date`
    )
  }
  
  if (isNaN(endDate.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} end_date is not a valid date`
    )
  }

  // Calculate the difference in milliseconds
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  // Convert to days
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays > 7) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} date range cannot exceed 7 days. Selected range: ${diffDays} days.`
    )
  }
}

/**
 * Middleware to validate created_at date range for returns export
 */
export function validateReturnsExportDateRange() {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    try {
      const { created_at, updated_at } = req.body as {
        created_at?: string | { start_date?: string; end_date?: string }
        updated_at?: string | { start_date?: string; end_date?: string }
      }

      // Parse created_at if it's a string (JSON stringified)
      let parsedCreatedAt: { start_date?: string; end_date?: string } | undefined
      if (created_at) {
        if (typeof created_at === 'string') {
          try {
            parsedCreatedAt = JSON.parse(created_at)
          } catch {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              'created_at must be a valid JSON object or object with start_date and end_date'
            )
          }
        } else {
          parsedCreatedAt = created_at
        }
      }

      // Validate that created_at is provided and the date range doesn't exceed 7 days
      validateDateRange(parsedCreatedAt, 'created_at')

      // Parse updated_at if it's a string (JSON stringified)
      let parsedUpdatedAt: { start_date?: string; end_date?: string } | undefined
      if (updated_at) {
        if (typeof updated_at === 'string') {
          try {
            parsedUpdatedAt = JSON.parse(updated_at)
          } catch {
            // If parsing fails, treat as undefined
            parsedUpdatedAt = undefined
          }
        } else {
          parsedUpdatedAt = updated_at
        }
      }

      // Validate updated_at if provided
      if (parsedUpdatedAt) {
        validateDateRange(parsedUpdatedAt, 'updated_at')
      }

      // Attach parsed dates to request for use in route handler
      req.body = {
        ...(req.body || {}),
        created_at: parsedCreatedAt,
        updated_at: parsedUpdatedAt
      }

      return next()
    } catch (error) {
      if (error instanceof MedusaError) {
        return res.status(400).json({
          error: error.type,
          message: error.message
        })
      }
      return next(error)
    }
  }
}

export const returnRequestsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/return-request',
    middlewares: [
      validateAndTransformQuery(
        AdminGetOrderReturnRequestParams,
        adminReturnOrderRequestQueryConfig.list
      ),
      applyRequestsStatusFilter()
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/return-request/:id',
    middlewares: [
      validateAndTransformQuery(
        AdminGetOrderReturnRequestParams,
        adminReturnOrderRequestQueryConfig.retrieve
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/return-request/:id',
    middlewares: [
      validateAndTransformQuery(
        AdminGetOrderReturnRequestParams,
        adminReturnOrderRequestQueryConfig.retrieve
      ),
      validateAndTransformBody(AdminUpdateOrderReturnRequest)
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/return-request/export',
    middlewares: [
      validateReturnsExportDateRange()
    ]
  }
]
