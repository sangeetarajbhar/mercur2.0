// import {
//   AuthenticatedMedusaRequest,
//   MedusaResponse
// } from '@medusajs/framework/http'

// import { cancelOrderWorkflow } from '../../../../../workflows/order/workflows/cancel-order'
// import { StoreCancelOrderType } from '../../validators'

// /**
//  * @oas [post] /store/orders/{id}/cancel
//  * operationId: "StoreCancelOrder"
//  * summary: "Cancel Order"
//  * description: "Cancels an order. The order can only be canceled if it doesn't have any fulfillments, or if all fulfillments are canceled. This will also cancel any uncaptured payments and refund any captured payments."
//  * x-authenticated: true
//  * parameters:
//  *   - name: id
//  *     in: path
//  *     description: The ID of the order to cancel.
//  *     required: true
//  *     schema:
//  *       type: string
//  * requestBody:
//  *   content:
//  *     application/json:
//  *       schema:
//  *         $ref: "#/components/schemas/StoreCancelOrder"
//  * responses:
//  *   "200":
//  *     description: OK
//  *     content:
//  *       application/json:
//  *         schema:
//  *           type: object
//  *           properties:
//  *             message:
//  *               type: string
//  *               description: Success message
//  *               example: "Order cancelled successfully"
//  *   "400":
//  *     description: Bad Request - Order cannot be cancelled
//  *     content:
//  *       application/json:
//  *         schema:
//  *           type: object
//  *           properties:
//  *             message:
//  *               type: string
//  *               example: "Order cannot be cancelled"
//  *   "401":
//  *     description: Unauthorized
//  *   "404":
//  *     description: Order not found
//  * tags:
//  *   - Store Orders
//  * security:
//  *   - api_token: []
//  *   - cookie_auth: []
//  */
// export const POST = async (
//   req: AuthenticatedMedusaRequest<StoreCancelOrderType>,
//   res: MedusaResponse
// ) => {
//   const { id: orderId } = req.params

//   try {
//     // Run the cancel order workflow
//     const workflow = cancelOrderWorkflow(req.scope)
    
//     await workflow.run({
//       input: {
//         order_id: orderId,
//         canceled_by: req.auth_context.actor_id // Customer ID
//       }
//     })

//     res.status(200).json({
//       message: 'Order cancelled successfully'
//     })
//   } catch (error) {
//     // Handle specific workflow errors - check fulfillments FIRST
//     if (error.message?.includes('fulfillment')) {
//       return res.status(400).json({
//         message: 'Cannot cancel order as items already fulfilled'
//       })
//     }

//     if (error.message?.includes('canceled')) {
//       return res.status(400).json({
//         message: 'Order has already been cancelled'
//       })
//     }

//     // Re-throw other errors to be handled by the framework
//     throw error
//   }
// }
