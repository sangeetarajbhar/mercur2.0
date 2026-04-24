import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  container
} from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'

/**
 * @oas [get] /vendor/notifications/{id}
 * operationId: "VendorGetNotification"
 * summary: "Get Notification"
 * description: "Retrieves a notification by ID for the authenticated vendor/seller."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     schema:
 *       type: string
 *     required: true
 *     description: The ID of the notification.
 *   - name: fields
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Comma-separated fields to include in the response.
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             notification:
 *               $ref: "#/components/schemas/VendorNotification"
 *   "401":
 *     description: Unauthorized
 *   "403":
 *     description: Forbidden
 *   "404":
 *     description: Not Found
 * tags:
 *   - Vendor Notifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const { data: notifications } = await query.graph({
    entity: 'notification',
    fields: req.queryConfig.fields,
    filters: {
      id,
      channel: 'seller_feed',
      to: seller.id
    }
  })

  if (!notifications || notifications.length === 0) {
    return res.status(404).json({
      message: 'Notification not found'
    })
  }

  res.json({
    notification: notifications[0]
  })
}
