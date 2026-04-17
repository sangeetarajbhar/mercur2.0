import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { exportCustomProductsBackgroundWorkflow } from '../../../../workflows/seller/workflows/export-custom-products-background'
import { randomUUID } from 'crypto'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { 
    seller_id, 
    brand_id, 
    category_id, 
    status,
    created_at,
    updated_at,
    tag_id,
    type_id,
    sales_channel_id
  } = req.body as { 
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

  try {
    // Check if at least one filter is provided
    const hasFilters = seller_id || brand_id || category_id || status || created_at || updated_at || tag_id || type_id || sales_channel_id
    
    if (!hasFilters) {
      return res.status(400).json({
        error: 'At least one filter is required. Please provide seller_id, brand_id, category_id, or other filters to export products.'
      })
    }

    // Generate unique transaction ID for tracking
    const transaction_id = randomUUID()
    
    // Get user ID from authenticated request (assuming it's available)
    const user_id = req.auth_context?.actor_id || 'admin'

    // Trigger background export workflow
    const { result } = await exportCustomProductsBackgroundWorkflow.run({
      container: req.scope,
      input: {
        user_id,
        transaction_id,
        channel: 'feed',  // Explicitly set admin channel
        seller_id,
        brand_id,
        category_id,
        status,
        created_at,
        updated_at,
        tag_id,
        type_id,
        sales_channel_id
      }
    })

    res.json({
      transaction_id: result.transaction_id,
      status: result.status,
      message: result.message
    })
  } catch (error) {
    console.error('Error starting background export:', error)
    res.status(500).json({
      error: 'Failed to start export',
      message: error.message
    })
  }
}
