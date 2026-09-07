import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"

import {
  PRICE_LIST_IMPORT_REQUEST_MODULE,
  PriceListImportRequestModuleService,
} from "../../../../../modules/price-list-import-request"
import { fetchSellerByAuthActorId } from "../../../../../shared/infra/http/utils"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const requestService =
    req.scope.resolve<PriceListImportRequestModuleService>(
      PRICE_LIST_IMPORT_REQUEST_MODULE
    )

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  if (!seller?.id) {
    res.status(404).json({ message: "Seller not found" })
    return
  }

  const { id } = req.params
  const request = await requestService.retrievePriceListImportRequest(id)

  if (!request || request.seller_id !== seller.id) {
    res.status(404).json({ message: "Price list request not found" })
    return
  }

  res.json({ price_list_request: request })
}
