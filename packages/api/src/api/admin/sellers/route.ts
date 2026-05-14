import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { expandSellerGraphRowForAdmin } from "./expand-seller-for-admin"

/**
 * @oas [get] /admin/sellers
 * operationId: "AdminListSellers"
 * summary: "List Sellers"
 * description: "Retrieves a list of sellers."
 * x-authenticated: true
 * tags:
 *   - Admin Sellers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sellers, metadata } = await query.graph({
    entity: "seller",
    fields: req.queryConfig.fields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    sellers: sellers.map((s: any) => expandSellerGraphRowForAdmin(s)),
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  })
}

