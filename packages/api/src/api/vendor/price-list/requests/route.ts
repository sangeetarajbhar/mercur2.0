import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MercurModules } from "@mercurjs/types"
const sellerModule = MercurModules.SELLER

import {
  PRICE_LIST_IMPORT_REQUEST_MODULE,
  PriceListImportRequestModuleService,
} from "../../../../modules/price-list-import-request"
import { fetchSellerByAuthActorId } from "../../../../shared/infra/http/utils"

/**
 * @oas [get] /vendor/price-list/requests
 * operationId: "VendorListPriceListRequests"
 * summary: "List own price list import requests"
 * description: "Retrieves the authenticated seller's price list import requests."
 * x-authenticated: true
 * tags:
 *   - Vendor Price List Requests
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const requestService =
    req.scope.resolve<PriceListImportRequestModuleService>(
      PRICE_LIST_IMPORT_REQUEST_MODULE
    )

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  if (!seller?.id) {
    res.status(404).json({ price_list_requests: [], count: 0, offset: 0, limit: 50 })
    return
  }

  const limit = Number(req.query?.limit ?? 50)
  const offset = Number(req.query?.offset ?? 0)

  const [requests, count] =
    await requestService.listAndCountPriceListImportRequests(
      { seller_id: seller.id },
      {
        take: limit,
        skip: offset,
        order: { created_at: "DESC" },
      }
    )

  res.json({
    price_list_requests: requests,
    count,
    offset,
    limit,
  })
}
