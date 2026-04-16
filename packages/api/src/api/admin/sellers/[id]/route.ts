import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import SellerBrandLink from '../../../../links/seller-brand'
import { constructS3Url } from '../../../../shared/utils/common'

import { updateSellerWorkflow } from '../../../../workflows/seller/workflows'
import { AdminUpdateSellerType } from '../validators'

/**
 * @oas [get] /admin/sellers/{id}
 * operationId: "AdminGetSeller"
 * summary: "Get Seller"
 * description: "Retrieves a specific seller by its ID."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The ID of the seller to retrieve.
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
 *             seller:
 *               $ref: "#/components/schemas/AdminSeller"
 *   "404":
 *     description: Not Found
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "Seller not found"
 * tags:
 *   - Admin Sellers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [seller]
  } = await query.graph(
    {
      entity: 'seller',
      fields: req.queryConfig.fields,
      filters: {
        id: req.params.id
      }
    },
    { throwIfKeyNotFound: true }
  )

  // For seller detail, fetch ALL brand associations (not paginated) to ensure form gets all brands
  // Use a large limit to get all brands in one request when loading seller for editing
  // Only use query limit/offset if explicitly provided, otherwise fetch all
  const limit = req.query?.limit ? Number(req.query.limit) : 10000
  const offset = req.query?.offset ? Number(req.query.offset) : 0

  const {
    data: brandLinks, 
    metadata: { count, take, skip } = {},
  } = await query.graph({
    entity: SellerBrandLink.entryPoint,
    fields: ['*', 'brand.*'],
    filters: {
      seller_id: req.params.id
    },
    pagination: {
      skip: offset,
      take: limit,
    },

  })

  const brandAssociations = brandLinks.map((link) => ({
    brand_id: link.brand?.id || link.brand_id || link.brand?.brand_id,
    name: link.brand?.name,
    handle: link.brand?.handle
  }))

  // Transform relative paths to full URLs for member photos and KYC documents
  // Helper to normalize path (remove leading slash if present)
  const normalizePath = (path: string | null | undefined): string => {
    if (!path) return ''
    // Remove leading slash if present
    return path.startsWith('/') ? path.slice(1) : path
  }

  const transformedSeller = {
    ...seller,
    // Transform member photo URLs
    members: seller.members?.map((member: any) => ({
      ...member,
      photo: member.photo ? constructS3Url(normalizePath(member.photo)) : member.photo
    })),
    // Transform KYC document file URLs
    kyc_documents: seller.kyc_documents?.map((doc: any) => ({
      ...doc,
      file_url: doc.file_url ? constructS3Url(normalizePath(doc.file_url)) : doc.file_url
    })),
    brand_associations: brandAssociations,
    brand_associations_count: count || brandAssociations.length,
    brand_associations_limit: take || limit,
    brand_associations_offset: skip ?? offset,
  }

  res.json({
    seller: transformedSeller
  })
}

/**
 * @oas [post] /admin/sellers/{id}
 * operationId: "AdminUpdateSeller"
 * summary: "Update Seller"
 * description: "Updates an existing seller with the specified properties."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The ID of the seller to update.
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           name:
 *             type: string
 *             minLength: 4
 *             description: The name of the seller.
 *           description:
 *             type: string
 *             description: A description of the seller.
 *           photo:
 *             type: string
 *             description: URL to the seller's photo.
 *           email:
 *             type: string
 *             format: email
 *             description: Store contact email.
 *           phone:
 *             type: string
 *             description: Store contact phone.
 *           address_line:
 *             type: string
 *             description: Seller address line.
 *           city:
 *             type: string
 *             description: Seller city.
 *           state:
 *             type: string
 *             description: Seller state.
 *           postal_code:
 *             type: string
 *             description: Seller postal code.
 *           country_code:
 *             type: string
 *             description: Seller country code.
 *           tax_id:
 *             type: string
 *             description: Seller tax ID.
 *           store_status:
 *             type: string
 *             enum: [active, inactive, suspended]
 *             description: The status of the seller's store.
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             seller:
 *               $ref: "#/components/schemas/AdminSeller"
 *   "404":
 *     description: Not Found
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "Seller not found"
 * tags:
 *   - Admin Sellers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateSellerType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  await updateSellerWorkflow(req.scope).run({
    input: {
      id,
      ...req.validatedBody
    }
  })

  const {
    data: [seller]
  } = await query.graph({
    entity: 'seller',
    fields: req.queryConfig.fields,
    filters: { id }
  })

  res.json({ seller })
}
