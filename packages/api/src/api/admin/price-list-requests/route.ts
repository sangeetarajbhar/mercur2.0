import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

import {
  PRICE_LIST_IMPORT_REQUEST_MODULE,
  PriceListImportRequestModuleService,
} from "../../../modules/price-list-import-request"

/**
 * @oas [get] /admin/price-list-requests
 * operationId: "AdminListPriceListRequests"
 * summary: "List price list import requests"
 * description: "Retrieves price list import requests pending admin approval."
 * x-authenticated: true
 * tags:
 *   - Admin Price List Requests
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const requestService =
    req.scope.resolve<PriceListImportRequestModuleService>(
      PRICE_LIST_IMPORT_REQUEST_MODULE
    )

  const { status, seller_id } = req.filterableFields as any
  const { take = 50, skip = 0 } = req.queryConfig?.pagination ?? {}

  const filters: Record<string, any> = {}
  if (status) filters.status = status
  if (seller_id) filters.seller_id = seller_id

  const [requests, count] = await requestService.listAndCountPriceListImportRequests(
    filters,
    {
      take: Number(take),
      skip: Number(skip),
      order: { created_at: "DESC" },
    }
  )

  res.json({
    price_list_requests: requests,
    count,
    offset: Number(skip),
    limit: Number(take),
  })
}
