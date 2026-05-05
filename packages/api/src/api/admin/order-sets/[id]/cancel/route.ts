import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

import { cancelOrderSetWorkflow } from "../../../../../workflows/order-set/workflows/cancel-order-set"

/**
 * @oas [post] /admin/order-sets/{id}/cancel
 * operationId: "AdminCancelOrderSet"
 * summary: "Cancel Order Set"
 * description: "Cancels an order set by canceling all orders in the set sequentially. This will also cancel any uncaptured payments, refund any captured payments, and update all line items to CANCELLED status. The order set must not be already cancelled and must not have any orders with status 'RFR'. Rider-assigned guard is enforced at the order-group level."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     description: The ID of the order set to cancel.
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
 *               example: "Order set successfully cancelled"
 *   "400":
 *     description: Bad Request - Order set cannot be cancelled
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "Order set is already cancelled" or "Order set cannot be canceled because one or more orders have status 'RFR'"
 *   "404":
 *     description: Order set not found
 *   "401":
 *     description: Unauthorized
 * tags:
 *   - Admin Order Sets
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params

  const input = {
    order_set_id: id,
    canceled_by: req.auth_context.actor_id,
  }

  try {
    await cancelOrderSetWorkflow(req.scope).run({
      input,
    })
    res.status(200).json({ message: "Order set successfully cancelled" })
  } catch (error) {
    // Handle MedusaError instances with proper type checking
    if (error instanceof MedusaError) {
      // Handle NOT_ALLOWED errors (e.g., rider assigned)
      if (error.type === MedusaError.Types.NOT_ALLOWED) {
        return res.status(400).json({
          message: error.message || 'Order set cannot be cancelled'
        } as any)
      }

      // Handle NOT_FOUND errors
      if (error.type === MedusaError.Types.NOT_FOUND) {
        return res.status(404).json({
          message: error.message || 'Order set not found'
        } as any)
      }

      // Handle other MedusaError types
      return res.status(400).json({
        message: error.message,
        type: error.type,
        code: error.code
      } as any)
    }

    // Handle workflow execution errors that might wrap MedusaError
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message
      
      // Check for specific error messages as fallback
      if (errorMessage.includes('already cancelled')) {
        return res.status(400).json({
          message: 'Order set is already cancelled'
        } as any)
      }

      if (errorMessage.includes('RFR')) {
        return res.status(400).json({
          message: 'Order set cannot be canceled because one or more orders have status \'RFR\''
        } as any)
      }

      if (errorMessage.includes('not found')) {
        return res.status(404).json({
          message: 'Order set not found'
        } as any)
      }
    }

    // Re-throw other errors to be handled by the framework
    throw error
  }
}

