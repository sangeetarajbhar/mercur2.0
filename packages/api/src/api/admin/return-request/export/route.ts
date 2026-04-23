import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import { exportReturnsBackgroundWorkflow } from '../../../../workflows/returns/workflows/export-returns-background'
import { randomUUID } from 'crypto'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { 
    status, 
    created_at, 
    updated_at,
    customer_id,
    order_id
  } = req.body as { 
    status?: string
    created_at?: { start_date?: string; end_date?: string }
    updated_at?: { start_date?: string; end_date?: string }
    customer_id?: string
    order_id?: string
  }

  // Dates are already parsed and validated by the middleware
  const parsedCreatedAt = created_at
  const parsedUpdatedAt = updated_at

  try {
    // Generate unique transaction ID for tracking
    const transaction_id = randomUUID()
    
    // Get user ID from authenticated request
    const user_id = req.auth_context?.actor_id || 'admin'

    // console.log(`[Returns Export API] Received export request with status: ${status}`)

    // No status mapping needed - return entity uses the same status values as the returns page
    // Status values: 'requested', 'received', 'canceled', 'refunded'

    // Trigger background export workflow
    const { result } = await exportReturnsBackgroundWorkflow.run({
      container: req.scope,
      input: {
        user_id,
        transaction_id,
        channel: 'feed',  // Explicitly set admin channel
        status,
        created_at: parsedCreatedAt!,
        updated_at: parsedUpdatedAt,
        customer_id,
        order_id
      }
    })

    res.json({
      transaction_id: result.transaction_id,
      status: result.status,
      message: result.message
    })
  } catch (error) {
    console.error('Error starting background returns export:', error)
    
    // If it's a MedusaError, return it with proper status code
    if (error instanceof MedusaError) {
      return res.status(400).json({
        error: error.type,
        message: error.message
      })
    }
    
    res.status(500).json({
      error: 'Failed to start export',
      message: error.message
    })
  }
}

