import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'

import { cancelOrderGroupWorkflow } from '../../../../../workflows/order-group/workflows/cancel-order-group'

/**
 * @oas [post] /admin/order-groups/{id}/cancel
 * operationId: "AdminCancelOrderGroup"
 * summary: "Cancel Order Group"
 * description: "Cancels an order group by cancelling all linked order-sets in parallel. Each order-set cancellation handles its own validation, payment voiding, inventory release, slot capacity restore, and event emission."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     description: The ID of the order group to cancel.
 *     required: true
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "Order group successfully cancelled"
 *   "400":
 *     description: Bad Request - one or more order-sets could not be cancelled
 *   "404":
 *     description: Order group not found or has no order-sets
 *   "401":
 *     description: Unauthorized
 * tags:
 *   - Admin Order Groups
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params

  try {
    await cancelOrderGroupWorkflow(req.scope).run({
      input: {
        order_group_id: id,
        canceled_by: req.auth_context.actor_id,
      },
    })

    res.status(200).json({ message: 'Order group successfully cancelled' })
  } catch (error) {
    if (error instanceof MedusaError) {
      if (error.type === MedusaError.Types.NOT_FOUND) {
        return res.status(404).json({ message: error.message } as any)
      }
      if (error.type === MedusaError.Types.NOT_ALLOWED) {
        return res.status(400).json({ message: error.message } as any)
      }
      return res.status(400).json({
        message: error.message,
        type: error.type,
        code: error.code,
      } as any)
    }

    throw error
  }
}
