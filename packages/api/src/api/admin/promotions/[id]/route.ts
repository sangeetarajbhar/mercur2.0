import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import promotionExtensionLink from '../../../../links/promotion-custom'
import { getPromotionExtensionFields, mapExtensionToAdditionalData } from '../../../../shared/utils/promotion-cache'

/**
 * @oas [get] /admin/promotions/{id}
 * operationId: "AdminGetPromotion"
 * summary: "Get Promotion with Extension Data"
 * description: "Retrieves a promotion with its extension data merged as additional_data"
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the promotion
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
 *             promotion:
 *               type: object
 * tags:
 *   - Admin Promotions
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const promotionId = req.params.id

  // Fetch the promotion
  const {
    data: [promotion]
  } = await query.graph({
    entity: 'promotion',
    fields: [
      'id',
      'code',
      'is_automatic',
      'type',
      'status',
      'created_at',
      'updated_at',
      'deleted_at',
      'campaign_id',
      'campaign.*',
      'campaign.budget.*',
      'application_method.*',
      'application_method.target_rules.*',
      'application_method.target_rules.values.*',
      'rules.*',
      'rules.values.*'
    ],
    filters: {
      id: promotionId
    }
  })

  if (!promotion) {
    return res.status(404).json({
      type: 'not_found',
      message: 'Promotion not found'
    })
  }

  // Fetch the promotion extension
  const {
    data: [link]
  } = await query.graph({
    entity: promotionExtensionLink.entryPoint,
    fields: getPromotionExtensionFields({
      includeSellerIds: true,
      includeOverrideExisting: true,
      includeApplicableOn: true
    }),
    filters: {
      promotion_id: promotionId
    }
  })

  // Merge extension data as additional_data
  const promotionWithExtension = {
    ...promotion,
    additional_data: mapExtensionToAdditionalData(link?.promotion_extension)
  }
  res.json({ promotion: promotionWithExtension })
}

