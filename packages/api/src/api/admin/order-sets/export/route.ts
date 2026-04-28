import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import { randomUUID } from 'crypto'
import { exportOrderSetsLevelBackgroundWorkflow } from '../../../../workflows/order-set/workflows'
import { validateDateRange, getDefaultDateRange } from '../../../../shared/utils'

type OrderSetExportFilters = {
  q?: string
  created_at?: Record<string, string> | string
  updated_at?: Record<string, string> | string
  status?: string[] | string
  delivery_type?: string[] | string
  order?: string | Record<string, string>
  channel?: string
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  let {
    q,
    status,
    delivery_type,
    created_at,
    updated_at,
    order,
    channel,
  } = (req.body || {}) as OrderSetExportFilters

  const user_id = req.auth_context?.actor_id

  if (!user_id) {
    return res.status(401).json({
      message: 'Unable to identify requesting user for order set export.',
    })
  }

  // If no date filters provided, default to last 7 days for created_at in IST
  if (!created_at && !updated_at) {
    created_at = getDefaultDateRange(7)
  }

  // Validate date ranges for both created_at and updated_at
  validateDateRange(created_at, 'created_at')
  validateDateRange(updated_at, 'updated_at')

  const transaction_id = randomUUID()

  try {
    const workflowResponse = await exportOrderSetsLevelBackgroundWorkflow.run({
      container: req.scope,
      input: {
        user_id,
        transaction_id,
        channel: channel || 'feed',
        q,
        created_at,
        updated_at,
        order,
        status,
        delivery_type,
      },
    })

    const result = workflowResponse?.result

    return res.status(202).json({
      transaction_id: result?.transaction_id ?? transaction_id,
      status: result?.status ?? 'processing',
      message:
        result?.message ??
        'Order set export started. You will be notified when it is ready.',
    })
  } catch (error) {
    console.error('Failed to trigger order set export workflow:', error)

    // Handle validation errors
    if (error instanceof MedusaError) {
      return res.status(400).json({
        message: error.message,
        type: error.type,
        transaction_id,
      })
    }

    return res.status(500).json({
      message: 'Failed to start order set export. Please try again later.',
      transaction_id,
    })
  }
}

