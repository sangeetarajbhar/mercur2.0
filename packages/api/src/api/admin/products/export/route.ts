import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { randomUUID } from 'crypto'
import { exportCustomProductsBackgroundWorkflow } from '../../../../workflows/seller/workflows/create-custom-products-background'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  try {
    // Extract query parameters (Medusa's default export uses query params)
    // Handle status as array (status[0]=published) or single value
    let statusValue: string | undefined = undefined
    if (req.query.status) {
      if (Array.isArray(req.query.status)) {
        statusValue = req.query.status[0] as string
      } else if (typeof req.query.status === 'object') {
        // Handle status[0]=published format
        const statusObj = req.query.status as any
        statusValue = statusObj[0] || statusObj['0'] || Object.values(statusObj)[0] as string
      } else {
        statusValue = req.query.status as string
      }
    }

    // Extract body parameters (in case they're sent in body)
    const body = (req.body || {}) as {
      seller_id?: string
      brand_id?: string
      category_id?: string
      status?: string
      created_at?: string
      updated_at?: string
      tag_id?: string
      type_id?: string
      sales_channel_id?: string
    }
    
    // Helper function to get value from query or body, prioritizing body
    const getFilterValue = (key: string): string | undefined => {
      // First check body
      if (body[key as keyof typeof body]) return body[key as keyof typeof body] as string
      
      // Then check query params
      const queryValue = req.query[key]
      if (queryValue) {
        if (Array.isArray(queryValue)) {
          return queryValue[0] as string
        }
        if (typeof queryValue === 'object') {
          // Handle array format like key[0]=value
          const obj = queryValue as any
          return obj[0] || obj['0'] || Object.values(obj)[0] as string
        }
        return queryValue as string
      }
      
      return undefined
    }

    // Build filters object, combining query params and body params (body takes priority)
    const filters: {
      seller_id?: string
      brand_id?: string
      category_id?: string
      status?: string
      created_at?: string
      updated_at?: string
      tag_id?: string
      type_id?: string
      sales_channel_id?: string
    } = {}

    // Extract each filter, prioritizing body over query
    filters.seller_id = body.seller_id || getFilterValue('seller_id')
    filters.brand_id = body.brand_id || getFilterValue('brand_id')
    filters.category_id = body.category_id || getFilterValue('category_id')
    filters.status = body.status || statusValue
    filters.created_at = body.created_at || getFilterValue('created_at')
    filters.updated_at = body.updated_at || getFilterValue('updated_at')
    filters.tag_id = body.tag_id || getFilterValue('tag_id')
    filters.type_id = body.type_id || getFilterValue('type_id')
    filters.sales_channel_id = body.sales_channel_id || getFilterValue('sales_channel_id')

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters]
      }
    })

    // Generate unique transaction ID for tracking
    const transaction_id = randomUUID()
    
    // Get user ID from authenticated request
    const user_id = req.auth_context?.actor_id || 'admin'

    // Trigger background export workflow using our custom export
    const { result } = await exportCustomProductsBackgroundWorkflow.run({
      container: req.scope,
      input: {
        user_id,
        transaction_id,
        channel: 'feed',  // Admin channel
        ...filters
      }
    })

    res.status(202).json({
      transaction_id: result.transaction_id,
      status: result.status,
      message: result.message || 'Product export started in background. You will be notified when it completes.'
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to start export',
      message: error?.message || 'unknown_error'
    })
  }
}

